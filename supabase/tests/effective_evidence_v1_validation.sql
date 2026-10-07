-- ZYNVO effective-evidence-v1 local validation.
-- Disposable local Postgres only. Rolls back its fixtures.
-- Does not call delivery RPCs and does not use question 1006.

\set ON_ERROR_STOP on

begin;

drop table if exists effective_evidence_validation_results;
create table effective_evidence_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

create or replace function pg_temp.ok(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into effective_evidence_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.bad(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into effective_evidence_validation_results(test_id, result, detail)
  values (p_id, 'FAIL', p_detail)
  on conflict (test_id) do update set result = 'FAIL', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.become(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create table pg_temp.made (
  evidence_id uuid primary key,
  attempt_id uuid,
  question_id integer,
  question_version_id uuid,
  learning_event_id uuid
);

create or replace function pg_temp.canonical(
  p_user uuid,
  p_question integer,
  p_observation text,
  p_at timestamptz
) returns uuid
language plpgsql as $$
declare
  v_event uuid;
  v_qv uuid;
  v_asg uuid;
  v_attempt uuid;
  v_evidence uuid;
begin
  if p_question = 1006 then
    raise exception 'question 1006 is reserved';
  end if;

  insert into public.learning_events (profile_id, event_type, occurred_at)
  values (p_user, 'question_attempt', p_at)
  returning id into v_event;

  select id
    into v_qv
    from public.question_versions
   where question_id = p_question
     and version_number = 1;

  if v_qv is null then
    raise exception 'missing question version %', p_question;
  end if;

  insert into public.question_assignments (user_id, question_id)
  values (p_user, p_question)
  returning id into v_asg;

  insert into public.question_attempts (
    user_id, question_id, subject, correct, attempt_number, is_review,
    learning_event_id, question_version_id, question_assignment_id,
    selected_answer, submission_id
  ) values (
    p_user,
    p_question,
    'Matemática e Raciocínio Lógico',
    p_observation = 'success',
    1,
    false,
    v_event,
    v_qv,
    v_asg,
    'A',
    gen_random_uuid()
  )
  returning id into v_attempt;

  insert into public.learning_evidence (
    profile_id, learning_event_id, knowledge_unit_id, stage, observation,
    strength, assistance_context, timing_interpretation, producer_type,
    producer_version, observed_at
  ) values (
    p_user, v_event, 'percentage-increase-decrease', 'comprehension', p_observation,
    'weak', 'unknown', 'unknown', 'deterministic_rule', 'm2c-v1', p_at
  )
  returning id into v_evidence;

  insert into pg_temp.made (
    evidence_id, attempt_id, question_id, question_version_id, learning_event_id
  ) values (
    v_evidence, v_attempt, p_question, v_qv, v_event
  );

  return v_evidence;
end;
$$;

create or replace function pg_temp.bare(
  p_user uuid,
  p_observation text
) returns uuid
language plpgsql as $$
declare
  v_event uuid;
  v_evidence uuid;
begin
  insert into public.learning_events (profile_id, event_type, occurred_at)
  values (p_user, 'question_attempt', now())
  returning id into v_event;

  insert into public.learning_evidence (
    profile_id, learning_event_id, knowledge_unit_id, stage, observation,
    strength, assistance_context, timing_interpretation, producer_type,
    producer_version, observed_at
  ) values (
    p_user, v_event, 'percentage-increase-decrease', 'comprehension', p_observation,
    'weak', 'unknown', 'unknown', 'deterministic_rule', 'm2c-v1', now()
  )
  returning id into v_evidence;

  return v_evidence;
end;
$$;

create or replace function pg_temp.ev(
  p_id uuid,
  p_profile uuid,
  p_event uuid,
  p_observation text,
  p_at timestamptz
) returns jsonb
language sql as $$
  select jsonb_build_object(
    'id', p_id,
    'profile_id', p_profile,
    'learning_event_id', p_event,
    'knowledge_unit_id', 'percentage-increase-decrease',
    'knowledge_unit_name', 'Aumento e desconto percentual',
    'stage', 'comprehension',
    'observation', p_observation,
    'strength', 'weak',
    'assistance_context', 'unknown',
    'timing_interpretation', 'unknown',
    'producer_type', 'deterministic_rule',
    'producer_version', 'm2c-v1',
    'observed_at', p_at,
    'generated_at', p_at
  );
$$;

create or replace function pg_temp.attempt_json(
  p_id uuid,
  p_event uuid,
  p_question integer,
  p_version uuid,
  p_user uuid
) returns jsonb
language sql as $$
  select jsonb_build_object(
    'id', p_id,
    'learning_event_id', p_event,
    'question_id', p_question,
    'question_version_id', p_version,
    'user_id', p_user
  );
$$;

create or replace function pg_temp.check_reading(
  p_test text,
  p_payload jsonb,
  p_integrity text,
  p_ids uuid[],
  p_status text default null
) returns void
language plpgsql as $$
declare
  v_got text[];
  v_expected text[];
begin
  if p_payload->>'resolver_version' is distinct from 'effective-evidence-v1'
     or p_payload->>'actions_applied' is distinct from 'true'
     or p_payload->>'integrity_status' is distinct from p_integrity
  then
    perform pg_temp.bad(p_test, p_payload::text);
    return;
  end if;

  select coalesce(array_agg(item->>'evidence_id' order by item->>'evidence_id'), '{}'::text[])
    into v_got
    from jsonb_array_elements(p_payload->'evidence') as item;

  select coalesce(array_agg(present.id order by present.id), '{}'::text[])
    into v_expected
    from (
      select unnest(coalesce(p_ids, '{}'::uuid[]))::text as id
    ) as present;

  if v_got is distinct from v_expected then
    perform pg_temp.bad(p_test, 'ids ' || v_got::text || ' expected ' || v_expected::text);
    return;
  end if;

  if p_integrity = 'ok' then
    if jsonb_array_length(p_payload->'unresolved_evidence_ids') <> 0
       or jsonb_array_length(p_payload->'components') <> 0
    then
      perform pg_temp.bad(p_test, 'ok reading carried unresolved data');
      return;
    end if;
  elsif jsonb_array_length(p_payload->'unresolved_evidence_ids') = 0
        or jsonb_array_length(p_payload->'components') = 0
  then
    perform pg_temp.bad(p_test, 'degraded reading was empty');
    return;
  end if;

  if p_status is not null and not exists (
    select 1
    from jsonb_array_elements(p_payload->'components') as component
    where component->>'status' = p_status
  ) then
    perform pg_temp.bad(p_test, 'missing status ' || p_status);
    return;
  end if;

  perform pg_temp.ok(p_test, p_integrity);
end;
$$;

do $effective$
declare
  v_smoke uuid := '11111111-1111-4111-8111-111111111111';
  v_diff uuid := '44444444-4444-4444-8444-444444444444';
  v_super uuid := '55555555-5555-4555-8555-555555555555';
  v_chain uuid := '66666666-6666-4666-8666-666666666666';
  v_dead uuid := '77777777-7777-4777-8777-777777777777';
  v_indep uuid := '88888888-8888-4888-8888-888888888888';
  v_missing uuid := '99999999-9999-4999-8999-999999999999';
  v_empty uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_other uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_guard uuid := 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  v_pure uuid := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_d uuid;
  v_e uuid;
  v_f uuid;
  v_g uuid;
  v_h uuid;
  v_payload jsonb;
  v_direct jsonb;
  v_def text;
  v_event uuid := '12121212-1212-4121-8121-121212121212';
  v_attempt uuid := '13131313-1313-4131-8131-131313131313';
  v_version uuid := '14141414-1414-4141-8141-141414141414';
  v_made record;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    'effective-' || row_number() over () || '@example.test',
    crypt('test', gen_salt('bf')),
    now(), now(), now(), '', '', '', ''
  from unnest(array[
    v_smoke, v_diff, v_super, v_chain, v_dead, v_indep, v_missing, v_empty, v_other, v_guard
  ]) as user_id;

  insert into public.profiles (id, display_name)
  select user_id, 'Effective'
  from unnest(array[
    v_smoke, v_diff, v_super, v_chain, v_dead, v_indep, v_missing, v_empty, v_other, v_guard
  ]) as user_id;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'learning_evidence'
      and column_name in ('question_id', 'question_version_id')
  ) then
    perform pg_temp.bad('EE-SCHEMA', 'question identity was copied onto learning_evidence');
  else
    perform pg_temp.ok('EE-SCHEMA', 'learning_evidence has no question identity columns');
  end if;

  v_a := pg_temp.canonical(v_smoke, 1002, 'difficulty', '2026-10-02 11:00:00+00');
  v_b := pg_temp.canonical(v_smoke, 1003, 'success', '2026-10-02 12:00:00+00');
  v_payload := public.effective_evidence_resolve(v_smoke);
  perform pg_temp.check_reading('EE-01', v_payload, 'ok', array[v_a, v_b], null);

  select * into v_made from pg_temp.made where evidence_id = v_a;
  if exists (
    select 1
    from jsonb_array_elements(v_payload->'evidence') as item
    where item->>'evidence_id' = v_a::text
      and (item->>'question_id')::integer = 1002
      and item->>'question_version_id' = v_made.question_version_id::text
      and item->>'attempt_id' = v_made.attempt_id::text
      and item->>'learning_event_id' = v_made.learning_event_id::text
  ) then
    perform pg_temp.ok('EE-22', 'provenance comes from the canonical attempt');
  else
    perform pg_temp.bad('EE-22', v_payload::text);
  end if;

  if v_payload->>'resolver_version' = 'effective-evidence-v1'
     and v_payload->>'actions_applied' = 'true'
  then
    perform pg_temp.ok('EE-20', 'effective-evidence-v1');
    perform pg_temp.ok('EE-21', 'actions_applied true');
  else
    perform pg_temp.bad('EE-20', v_payload::text);
    perform pg_temp.bad('EE-21', v_payload::text);
  end if;

  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_a, 'invalidate', null, 'fixture invalidate', 'deterministic_rule', 'effective-evidence-v1'
  );

  if exists (select 1 from public.learning_evidence where id = v_a) then
    perform pg_temp.ok('EE-03', 'raw evidence preserved');
  else
    perform pg_temp.bad('EE-03', 'raw row missing');
  end if;

  v_payload := public.effective_evidence_resolve(v_smoke);
  perform pg_temp.check_reading('EE-02', v_payload, 'ok', array[v_b], null);
  if exists (
    select 1
    from jsonb_array_elements(v_payload->'evidence') as item
    where item->>'evidence_id' = v_a::text
  ) then
    perform pg_temp.bad('EE-07', 'invalidated evidence remained effective');
  else
    perform pg_temp.ok('EE-07', 'no fallback to invalidated evidence');
  end if;

  v_a := pg_temp.canonical(v_diff, 1002, 'difficulty', '2026-10-02 11:00:00+00');
  v_b := pg_temp.canonical(v_diff, 1003, 'success', '2026-10-02 12:00:00+00');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_b, 'invalidate', null, 'fixture invalidate', 'deterministic_rule', 'effective-evidence-v1'
  );
  perform pg_temp.check_reading(
    'EE-02B',
    public.effective_evidence_resolve(v_diff),
    'ok',
    array[v_a],
    null
  );

  v_a := pg_temp.canonical(v_super, 1002, 'difficulty', '2026-10-02 11:00:00+00');
  v_b := pg_temp.canonical(v_super, 1003, 'success', '2026-10-02 12:00:00+00');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_a, 'supersede', v_b, 'fixture supersede', 'deterministic_rule', 'effective-evidence-v1'
  );
  v_payload := public.effective_evidence_resolve(v_super);
  perform pg_temp.check_reading('EE-04', v_payload, 'ok', array[v_b], null);
  if (v_payload->'evidence'->0->>'observation') = 'success' then
    perform pg_temp.ok('EE-04B', 'replacement keeps its own observation');
  else
    perform pg_temp.bad('EE-04B', v_payload::text);
  end if;

  v_a := pg_temp.canonical(v_chain, 1007, 'difficulty', '2026-10-02 11:00:00+00');
  v_b := pg_temp.canonical(v_chain, 1008, 'success', '2026-10-02 12:00:00+00');
  v_c := pg_temp.canonical(v_chain, 1009, 'success', '2026-10-02 13:00:00+00');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values
    (v_a, 'supersede', v_b, 'chain', 'deterministic_rule', 'effective-evidence-v1'),
    (v_b, 'supersede', v_c, 'chain', 'deterministic_rule', 'effective-evidence-v1');
  perform pg_temp.check_reading(
    'EE-05',
    public.effective_evidence_resolve(v_chain),
    'ok',
    array[v_c],
    null
  );

  v_a := pg_temp.canonical(v_dead, 1001, 'difficulty', '2026-10-02 11:00:00+00');
  v_b := pg_temp.canonical(v_dead, 1004, 'success', '2026-10-02 12:00:00+00');
  v_c := pg_temp.canonical(v_dead, 1005, 'success', '2026-10-02 13:00:00+00');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values
    (v_a, 'supersede', v_b, 'chain', 'deterministic_rule', 'effective-evidence-v1'),
    (v_b, 'supersede', v_c, 'chain', 'deterministic_rule', 'effective-evidence-v1'),
    (v_c, 'invalidate', null, 'terminal', 'deterministic_rule', 'effective-evidence-v1');
  v_payload := public.effective_evidence_resolve(v_dead);
  perform pg_temp.check_reading('EE-06', v_payload, 'ok', '{}'::uuid[], null);
  if v_payload->'evidence' = '[]'::jsonb
     and exists (select 1 from public.learning_evidence where id in (v_a, v_b, v_c))
  then
    perform pg_temp.ok('EE-08', 'predecessors do not return');
  else
    perform pg_temp.bad('EE-08', v_payload::text);
  end if;

  v_a := pg_temp.bare(v_guard, 'difficulty');
  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values
      (v_a, 'invalidate', null, 'once', 'deterministic_rule', 'effective-evidence-v1'),
      (v_a, 'invalidate', null, 'twice', 'deterministic_rule', 'effective-evidence-v1');
    perform pg_temp.bad('EE-09', 'duplicate invalidate accepted');
  exception when unique_violation then
    perform pg_temp.ok('EE-09', sqlerrm);
  end;

  v_b := pg_temp.bare(v_guard, 'success');
  v_c := pg_temp.bare(v_guard, 'success');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_b, 'supersede', v_c, 'once', 'deterministic_rule', 'effective-evidence-v1'
  );
  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_b, 'supersede', v_c, 'twice', 'deterministic_rule', 'effective-evidence-v1'
    );
    perform pg_temp.bad('EE-10', 'duplicate supersede accepted');
  exception when unique_violation then
    perform pg_temp.ok('EE-10', sqlerrm);
  end;

  v_d := pg_temp.bare(v_guard, 'difficulty');
  v_e := pg_temp.bare(v_guard, 'success');
  v_f := pg_temp.bare(v_guard, 'success');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_d, 'supersede', v_e, 'first successor', 'deterministic_rule', 'effective-evidence-v1'
  );
  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_d, 'supersede', v_f, 'second successor', 'deterministic_rule', 'effective-evidence-v1'
    );
    perform pg_temp.bad('EE-11', 'two successors accepted');
  exception when unique_violation then
    perform pg_temp.ok('EE-11', sqlerrm);
  end;

  v_g := pg_temp.bare(v_guard, 'difficulty');
  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_g, 'supersede', v_e, 'second predecessor', 'deterministic_rule', 'effective-evidence-v1'
    );
    perform pg_temp.bad('EE-12', 'two predecessors accepted');
  exception when unique_violation then
    perform pg_temp.ok('EE-12', sqlerrm);
  end;

  v_a := pg_temp.bare(v_guard, 'difficulty');
  v_b := pg_temp.bare(v_guard, 'success');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_a, 'supersede', v_b, 'forward', 'deterministic_rule', 'effective-evidence-v1'
  );
  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_b, 'supersede', v_a, 'back', 'deterministic_rule', 'effective-evidence-v1'
    );
    perform pg_temp.bad('EE-13', 'two-node cycle accepted');
  exception when check_violation then
    if position('cycle' in sqlerrm) > 0 then
      perform pg_temp.ok('EE-13', sqlerrm);
    else
      perform pg_temp.bad('EE-13', sqlerrm);
    end if;
  end;

  v_a := pg_temp.bare(v_guard, 'difficulty');
  v_b := pg_temp.bare(v_guard, 'success');
  v_c := pg_temp.bare(v_guard, 'success');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values
    (v_a, 'supersede', v_b, 'long', 'deterministic_rule', 'effective-evidence-v1'),
    (v_b, 'supersede', v_c, 'long', 'deterministic_rule', 'effective-evidence-v1');
  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_c, 'supersede', v_a, 'close', 'deterministic_rule', 'effective-evidence-v1'
    );
    perform pg_temp.bad('EE-14', 'longer cycle accepted');
  exception when check_violation then
    if position('cycle' in sqlerrm) > 0 then
      perform pg_temp.ok('EE-14', sqlerrm);
    else
      perform pg_temp.bad('EE-14', sqlerrm);
    end if;
  end;

  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_a, 'supersede', v_a, 'self', 'deterministic_rule', 'effective-evidence-v1'
    );
    perform pg_temp.bad('EE-SELF', 'self loop accepted');
  exception when check_violation then
    if position('cycle' in sqlerrm) = 0 then
      perform pg_temp.ok('EE-SELF', sqlerrm);
    else
      perform pg_temp.bad('EE-SELF', sqlerrm);
    end if;
  end;

  v_a := pg_temp.canonical(v_indep, 1001, 'difficulty', '2026-10-02 11:00:00+00');
  v_b := pg_temp.canonical(v_indep, 1005, 'success', '2026-10-02 12:00:00+00');
  v_c := pg_temp.canonical(v_indep, 1002, 'difficulty', '2026-10-02 13:00:00+00');
  v_d := pg_temp.canonical(v_indep, 1003, 'success', '2026-10-02 14:00:00+00');
  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values
    (v_a, 'supersede', v_b, 'left', 'deterministic_rule', 'effective-evidence-v1'),
    (v_c, 'supersede', v_d, 'right', 'deterministic_rule', 'effective-evidence-v1');
  perform pg_temp.check_reading(
    'EE-15',
    public.effective_evidence_resolve(v_indep),
    'ok',
    array[v_b, v_d],
    null
  );

  v_a := pg_temp.bare(v_missing, 'difficulty');
  v_b := pg_temp.canonical(v_missing, 1003, 'success', '2026-10-02 12:00:00+00');
  v_payload := public.effective_evidence_resolve(v_missing);
  perform pg_temp.check_reading('EE-16', v_payload, 'degraded', array[v_b], 'PROVENANCE_MISSING');
  if exists (
    select 1
    from jsonb_array_elements(v_payload->'unresolved_evidence_ids') as item
    where item = to_jsonb(v_a)
  ) and not exists (
    select 1
    from jsonb_array_elements(v_payload->'evidence') as item
    where item->>'evidence_id' = v_a::text
  ) then
    perform pg_temp.ok('EE-16B', 'missing provenance does not hide the intact evidence');
  else
    perform pg_temp.bad('EE-16B', v_payload::text);
  end if;

  perform pg_temp.check_reading(
    'EE-23-OK',
    public.effective_evidence_resolve(v_empty),
    'ok',
    '{}'::uuid[],
    null
  );
  if public.effective_evidence_resolve(v_empty)->>'actions_applied' = 'true'
     and v_payload->>'actions_applied' = 'true'
     and v_payload->>'integrity_status' = 'degraded'
     and jsonb_array_length(v_payload->'evidence') = 1
  then
    perform pg_temp.ok('EE-23', 'empty ok is distinct from degraded');
  else
    perform pg_temp.bad('EE-23', v_payload::text);
  end if;

  v_h := pg_temp.canonical(v_other, 1007, 'success', '2026-10-02 15:00:00+00');
  perform pg_temp.become(v_smoke);
  v_payload := public.read_effective_learning_evidence();
  reset role;
  v_direct := public.effective_evidence_resolve(v_smoke);
  if v_payload = v_direct
     and not exists (
       select 1
       from jsonb_array_elements(v_payload->'evidence') as item
       where item->>'evidence_id' = v_h::text
     )
  then
    perform pg_temp.ok('EE-18', 'authenticated reads only the signed-in profile');
  else
    perform pg_temp.bad('EE-18', v_payload::text);
  end if;

  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);
    perform public.read_effective_learning_evidence();
    perform pg_temp.bad('EE-17', 'unauthenticated call returned a payload');
  exception when invalid_authorization_specification then
    perform pg_temp.ok('EE-17', sqlerrm);
  when others then
    perform pg_temp.bad('EE-17', SQLSTATE || ' ' || sqlerrm);
  end;
  reset role;

  if has_table_privilege('authenticated', 'public.evidence_actions', 'select') then
    perform pg_temp.bad('EE-19', 'authenticated has select on evidence_actions');
  else
    perform pg_temp.ok('EE-19', 'no direct select grant');
  end if;

  begin
    perform pg_temp.become(v_smoke);
    perform 1 from public.evidence_actions;
    perform pg_temp.bad('EE-19B', 'authenticated selected evidence_actions');
  exception when insufficient_privilege then
    perform pg_temp.ok('EE-19B', sqlerrm);
  when others then
    perform pg_temp.bad('EE-19B', SQLSTATE || ' ' || sqlerrm);
  end;
  reset role;

  if has_function_privilege('anon', 'public.read_effective_learning_evidence()', 'execute')
     or has_function_privilege(
       'authenticated',
       'public.effective_evidence_resolve(uuid)',
       'execute'
     )
  then
    perform pg_temp.bad('EE-GRANT', 'private resolver or anon execute is granted');
  elsif has_function_privilege(
    'authenticated',
    'public.read_effective_learning_evidence()',
    'execute'
  ) then
    perform pg_temp.ok('EE-GRANT', 'authenticated execute is limited to the read RPC');
  else
    perform pg_temp.bad('EE-GRANT', 'authenticated cannot execute the read RPC');
  end if;

  v_a := '01010101-0101-4101-8101-010101010101';
  v_b := '02020202-0202-4202-8202-020202020202';
  v_c := '03030303-0303-4303-8303-030303030303';
  v_d := '04040404-0404-4404-8404-040404040404';
  v_e := '05050505-0505-4505-8505-050505050505';

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'invalidate', 'replacement_evidence_id', null),
      jsonb_build_object('evidence_id', v_a, 'action', 'invalidate', 'replacement_evidence_id', null)
    ),
    '[]'::jsonb
  );
  perform pg_temp.check_reading('EE-25', v_payload, 'ok', '{}'::uuid[], null);

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00'),
      pg_temp.ev(v_b, v_pure, v_event, 'success', '2026-10-02 12:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_b),
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_b)
    ),
    jsonb_build_array(pg_temp.attempt_json(v_attempt, v_event, 1003, v_version, v_pure))
  );
  perform pg_temp.check_reading('EE-26', v_payload, 'ok', array[v_b], null);

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00'),
      pg_temp.ev(v_b, v_pure, v_event, 'success', '2026-10-02 12:00:00+00'),
      pg_temp.ev(v_c, v_pure, v_event, 'success', '2026-10-02 13:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_b),
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_c)
    ),
    '[]'::jsonb
  );
  perform pg_temp.check_reading('EE-27', v_payload, 'degraded', '{}'::uuid[], 'MULTIPLE_SUCCESSORS');

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00'),
      pg_temp.ev(v_b, v_pure, v_event, 'success', '2026-10-02 12:00:00+00'),
      pg_temp.ev(v_c, v_pure, v_event, 'success', '2026-10-02 13:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_c),
      jsonb_build_object('evidence_id', v_b, 'action', 'supersede', 'replacement_evidence_id', v_c)
    ),
    '[]'::jsonb
  );
  perform pg_temp.check_reading('EE-28', v_payload, 'degraded', '{}'::uuid[], 'MULTIPLE_PREDECESSORS');

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00'),
      pg_temp.ev(v_b, v_pure, v_event, 'success', '2026-10-02 12:00:00+00'),
      pg_temp.ev(v_d, v_pure, v_event, 'difficulty', '2026-10-02 13:00:00+00'),
      pg_temp.ev(v_e, v_pure, v_event, 'success', '2026-10-02 14:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_b),
      jsonb_build_object('evidence_id', v_b, 'action', 'supersede', 'replacement_evidence_id', v_a),
      jsonb_build_object('evidence_id', v_d, 'action', 'supersede', 'replacement_evidence_id', v_e)
    ),
    jsonb_build_array(pg_temp.attempt_json(v_attempt, v_event, 1003, v_version, v_pure))
  );
  perform pg_temp.check_reading('EE-29', v_payload, 'degraded', array[v_e], 'CYCLE');

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00'),
      pg_temp.ev(v_b, v_pure, v_event, 'success', '2026-10-02 12:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'invalidate', 'replacement_evidence_id', null),
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_b)
    ),
    '[]'::jsonb
  );
  perform pg_temp.check_reading('EE-30', v_payload, 'degraded', '{}'::uuid[], 'ACTION_CONFLICT');

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00'),
      jsonb_build_object('id', v_b, 'profile_id', v_other)
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_b)
    ),
    '[]'::jsonb
  );
  perform pg_temp.check_reading('EE-31', v_payload, 'degraded', '{}'::uuid[], 'PROFILE_MISMATCH');

  v_payload := public.effective_evidence_resolve_inputs(
    v_pure,
    jsonb_build_array(
      pg_temp.ev(v_a, v_pure, v_event, 'difficulty', '2026-10-02 11:00:00+00')
    ),
    jsonb_build_array(
      jsonb_build_object('evidence_id', v_a, 'action', 'supersede', 'replacement_evidence_id', v_a)
    ),
    '[]'::jsonb
  );
  perform pg_temp.check_reading('EE-32', v_payload, 'degraded', '{}'::uuid[], 'SCHEMA_IMPOSSIBLE_STATE');

  select pg_get_functiondef('public.effective_evidence_resolve_inputs(uuid,jsonb,jsonb,jsonb)'::regprocedure)
    into v_def;
  if position('created_at' in v_def) = 0
     and position('1006' in v_def) = 0
     and position('distinct' in v_def) > 0
  then
    perform pg_temp.ok('EE-24', 'resolver does not use question 1006 or action time as precedence');
  else
    perform pg_temp.bad('EE-24', 'resolver definition drifted');
  end if;

  if exists (
    select 1
    from public.question_attempts
    where question_id = 1006
      and user_id in (
        v_smoke, v_diff, v_super, v_chain, v_dead, v_indep, v_missing, v_empty, v_other, v_guard
      )
  ) then
    perform pg_temp.bad('EE-24B', 'question 1006 attempt was created');
  else
    perform pg_temp.ok('EE-24B', 'question 1006 was not consumed');
  end if;
end;
$effective$;

select test_id, result, detail
from effective_evidence_validation_results
order by test_id;

do $$
begin
  if exists (
    select 1
    from effective_evidence_validation_results
    where result <> 'PASS'
  ) then
    raise exception 'EFFECTIVE EVIDENCE SQL VALIDATION FAILED';
  end if;
end;
$$;

rollback;
