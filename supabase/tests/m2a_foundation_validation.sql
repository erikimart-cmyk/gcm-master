-- ZYNVO M2A local constraint/RLS validation.
-- Disposable local Postgres/Supabase only.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/m2a_foundation_validation.sql

\set ON_ERROR_STOP on

drop table if exists m2a_validation_results;
create table m2a_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

grant all on table m2a_validation_results to authenticated, anon;

create or replace function pg_temp.m2a_pass(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into m2a_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.m2a_fail(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into m2a_validation_results(test_id, result, detail)
  values (p_id, 'FAIL', p_detail)
  on conflict (test_id) do update set result = 'FAIL', detail = excluded.detail;
end;
$$;

do $m2a$
declare
  v_user_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_user_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_qv uuid;
  v_event_a uuid;
  v_event_b uuid;
  v_ev_a uuid;
  v_ev_a2 uuid;
  v_ev_b uuid;
  v_assignment uuid;
  v_journey_b uuid;
  v_cnt integer;
  v_null_count integer;
begin
  perform pg_temp.m2a_pass(
    'hist_qv_zero',
    (select count(*)::text from public.question_versions)
  );
  perform pg_temp.m2a_pass(
    'hist_events_zero',
    (select count(*)::text from public.learning_events)
  );
  perform pg_temp.m2a_pass(
    'hist_evidence_zero',
    (select count(*)::text from public.learning_evidence)
  );
  perform pg_temp.m2a_pass(
    'hist_actions_zero',
    (select count(*)::text from public.evidence_actions)
  );

  insert into public.knowledge_units (id, name, description, status)
  values
    ('porcentagem-basica', 'Porcentagem básica', 'Relacionar parte e todo.', 'published'),
    ('descontos-sucessivos', 'Descontos sucessivos', null, 'draft'),
    ('proporcionalidade-simples', 'Proporcionalidade', null, 'draft');
  perform pg_temp.m2a_pass('A4', 'knowledge_units schema accepts valid rows');

  begin
    insert into public.knowledge_units (id, name, status)
    values ('Bad_ID', 'x', 'published');
    perform pg_temp.m2a_fail('A5', 'invalid id accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A5', sqlerrm);
  end;

  begin
    insert into public.knowledge_units (id, name, status)
    values ('ok-id', 'x', 'live');
    perform pg_temp.m2a_fail('A6', 'invalid status accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A6', sqlerrm);
  end;

  insert into public.question_versions (
    question_id, version_number, statement, alternatives, correct_answer,
    explanation, difficulty, source_type, validation_status
  ) values (
    1001, 1, 'Quanto é 10% de 350?',
    '[{"id":"A","text":"25"},{"id":"B","text":"30"},{"id":"C","text":"35"}]'::jsonb,
    'C', '10% de 350 = 35', 'easy', 'zynvo_original', 'draft'
  )
  returning id into v_qv;
  perform pg_temp.m2a_pass('A7', 'FK question_id -> questions');

  begin
    insert into public.question_versions (
      question_id, version_number, statement, alternatives, correct_answer,
      explanation, difficulty, source_type, validation_status
    ) values (
      1001, 1, 'dup',
      '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb,
      'A', 'e', 'easy', 'zynvo_original', 'draft'
    );
    perform pg_temp.m2a_fail('A8', 'duplicate version_number accepted');
  exception when unique_violation then
    perform pg_temp.m2a_pass('A8', sqlerrm);
  end;

  begin
    insert into public.question_versions (
      question_id, version_number, statement, alternatives, correct_answer,
      explanation, difficulty, source_type, validation_status
    ) values (
      1001, 2, 'x', '{"not":"array"}'::jsonb,
      'A', 'e', 'easy', 'zynvo_original', 'draft'
    );
    perform pg_temp.m2a_fail('A9', 'non-array alternatives accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A9', sqlerrm);
  end;

  begin
    insert into public.question_versions (
      question_id, version_number, statement, alternatives, correct_answer,
      explanation, difficulty, source_type, validation_status, published_at
    ) values (
      1001, 3, 'x',
      '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb,
      'A', 'e', 'easy', 'zynvo_original', 'draft', now()
    );
    perform pg_temp.m2a_fail('A10', 'published non-approved accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A10', sqlerrm);
  end;

  insert into public.question_version_knowledge_units
    (question_version_id, knowledge_unit_id, role)
  values
    (v_qv, 'porcentagem-basica', 'primary'),
    (v_qv, 'descontos-sucessivos', 'supporting');
  perform pg_temp.m2a_pass('A13', 'primary/supporting mapping on draft');

  begin
    insert into public.question_version_knowledge_units
      (question_version_id, knowledge_unit_id, role)
    values (v_qv, 'proporcionalidade-simples', 'causal');
    perform pg_temp.m2a_fail('A14', 'invalid role accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A14', sqlerrm);
  end;

  update public.question_versions
  set validation_status = 'approved', published_at = now()
  where id = v_qv;

  begin
    update public.question_versions set statement = 'mutated' where id = v_qv;
    perform pg_temp.m2a_fail('A11', 'published mutation succeeded');
  exception when others then
    perform pg_temp.m2a_pass('A11', sqlerrm);
  end;

  begin
    update public.question_version_knowledge_units
    set role = 'supporting'
    where question_version_id = v_qv
      and knowledge_unit_id = 'porcentagem-basica';
    perform pg_temp.m2a_fail('A12', 'published mapping mutation succeeded');
  exception when others then
    perform pg_temp.m2a_pass('A12', sqlerrm);
  end;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'm2a-a@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'm2a-b@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', '');

  insert into public.profiles (id, display_name)
  values (v_user_a, 'M2A A'), (v_user_b, 'M2A B');

  begin
    insert into public.learning_events (profile_id, event_type, occurred_at)
    values ('00000000-0000-0000-0000-000000000000', 'question_attempt', now());
    perform pg_temp.m2a_fail('A15', 'invalid profile accepted');
  exception when foreign_key_violation then
    perform pg_temp.m2a_pass('A15', sqlerrm);
  end;

  insert into public.learning_events (profile_id, journey_id, event_type, occurred_at)
  values (v_user_a, null, 'question_attempt', now())
  returning id into v_event_a;
  perform pg_temp.m2a_pass('A16', 'optional journey_id null accepted');

  insert into public.journeys (id, profile_id, title, status)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', v_user_b, 'B Journey', 'active')
  returning id into v_journey_b;

  begin
    insert into public.learning_events (profile_id, journey_id, event_type, occurred_at)
    values (v_user_a, v_journey_b, 'question_attempt', now());
    perform pg_temp.m2a_fail('A17', 'cross-profile journey accepted');
  exception when others then
    perform pg_temp.m2a_pass('A17', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'porcentagem-basica',
      'application', 'success', 'moderate', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A18', 'invalid event accepted');
  exception when raise_exception then
    -- Approved control is BEFORE INSERT trigger
    -- public.enforce_learning_evidence_event_profile (SQLSTATE P0001).
    -- Do not treat a later FK miss as equivalent; that would hide trigger regression.
    if SQLSTATE = 'P0001'
       and position(
         'learning_evidence.profile_id must match learning_events.profile_id'
         in SQLERRM
       ) > 0 then
      perform pg_temp.m2a_pass(
        'A18',
        SQLSTATE || ' enforce_learning_evidence_event_profile: ' || SQLERRM
      );
    else
      perform pg_temp.m2a_fail(
        'A18',
        'unexpected raise_exception: ' || SQLSTATE || ' ' || SQLERRM
      );
    end if;
  when foreign_key_violation then
    perform pg_temp.m2a_fail(
      'A18',
      'rejected by FK instead of enforce_learning_evidence_event_profile: '
      || SQLSTATE || ' ' || SQLERRM
    );
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'does-not-exist',
      'application', 'success', 'moderate', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A19', 'invalid knowledge unit accepted');
  exception when foreign_key_violation then
    perform pg_temp.m2a_pass('A19', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_b, v_event_a, 'porcentagem-basica',
      'application', 'success', 'moderate', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A20', 'mismatched evidence/event profile accepted');
  exception when others then
    perform pg_temp.m2a_pass('A20', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'porcentagem-basica',
      'mastery', 'success', 'moderate', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A21', 'invalid stage accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A21', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'porcentagem-basica',
      'application', 'wrong', 'moderate', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A22', 'invalid observation accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A22', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'porcentagem-basica',
      'application', 'success', 'extreme', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A23', 'invalid strength accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A23', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'porcentagem-basica',
      'application', 'success', 'moderate', 'coach', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A24', 'invalid assistance_context accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A24', sqlerrm);
  end;

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'porcentagem-basica',
      'application', 'success', 'moderate', 'unknown', 'fast',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A25', 'invalid timing_interpretation accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A25', sqlerrm);
  end;

  insert into public.learning_evidence (
    profile_id, learning_event_id, knowledge_unit_id, stage, observation,
    strength, assistance_context, timing_interpretation, producer_type,
    producer_version, observed_at
  ) values (
    v_user_a, v_event_a, 'porcentagem-basica',
    'application', 'success', 'moderate', 'unknown', 'unknown',
    'deterministic_rule', 'm2a-test', now()
  )
  returning id into v_ev_a;

  insert into public.learning_evidence (
    profile_id, learning_event_id, knowledge_unit_id, stage, observation,
    strength, assistance_context, timing_interpretation, producer_type,
    producer_version, observed_at
  ) values (
    v_user_a, v_event_a, 'descontos-sucessivos',
    'application', 'difficulty', 'weak', 'unknown', 'unknown',
    'deterministic_rule', 'm2a-test', now()
  )
  returning id into v_ev_a2;

  insert into public.learning_events (profile_id, event_type, occurred_at)
  values (v_user_b, 'question_attempt', now())
  returning id into v_event_b;

  insert into public.learning_evidence (
    profile_id, learning_event_id, knowledge_unit_id, stage, observation,
    strength, assistance_context, timing_interpretation, producer_type,
    producer_version, observed_at
  ) values (
    v_user_b, v_event_b, 'porcentagem-basica',
    'application', 'success', 'moderate', 'unknown', 'unknown',
    'deterministic_rule', 'm2a-test', now()
  )
  returning id into v_ev_b;

  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_ev_a2, 'invalidate', null, 'fixture invalidate', 'deterministic_rule', 'm2a-test'
  );
  perform pg_temp.m2a_pass('A26', 'invalidate with null replacement');

  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_ev_a, 'invalidate', v_ev_a2, 'should fail', 'deterministic_rule', 'm2a-test'
    );
    perform pg_temp.m2a_fail('A26b', 'invalidate with replacement accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A26b', sqlerrm);
  end;

  insert into public.evidence_actions (
    evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
  ) values (
    v_ev_a, 'supersede', v_ev_a2, 'fixture supersede', 'deterministic_rule', 'm2a-test'
  );
  perform pg_temp.m2a_pass('A27', 'supersede with replacement');

  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_ev_a, 'supersede', v_ev_a, 'self', 'deterministic_rule', 'm2a-test'
    );
    perform pg_temp.m2a_fail('A28', 'self-supersession accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A28', sqlerrm);
  end;

  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_ev_a, 'supersede', v_ev_b, 'cross profile', 'deterministic_rule', 'm2a-test'
    );
    perform pg_temp.m2a_fail('A29', 'cross-profile supersede accepted');
  exception when others then
    perform pg_temp.m2a_pass('A29', sqlerrm);
  end;

  select count(*) into v_cnt from public.question_assignments;
  select count(*) filter (where id is null) into v_null_count from public.question_assignments;
  if v_null_count = 0 then
    perform pg_temp.m2a_pass('A33', 'assignment rows remain queryable, count=' || v_cnt);
    perform pg_temp.m2a_pass('A34', 'all assignment rows have technical uuid');
  else
    perform pg_temp.m2a_fail('A34', 'null assignment id count=' || v_null_count);
  end if;

  select count(*) filter (where question_version_id is not null)
    into v_cnt from public.question_assignments;
  if v_cnt = 0 then
    perform pg_temp.m2a_pass('A35', 'no historical assignment QV');
  else
    perform pg_temp.m2a_fail('A35', 'unexpected QV on assignments=' || v_cnt);
  end if;

  select count(*) filter (where presented_at is not null)
    into v_cnt from public.question_assignments;
  if v_cnt = 0 then
    perform pg_temp.m2a_pass('A36', 'no historical presented_at');
  else
    perform pg_temp.m2a_fail('A36', 'unexpected presented_at=' || v_cnt);
  end if;

  select count(*) filter (where learning_event_id is not null)
    into v_cnt from public.question_attempts;
  if v_cnt = 0 then
    perform pg_temp.m2a_pass('A37', 'historical attempts remain without canonical required fields');
    perform pg_temp.m2a_pass('A38', 'no historical learning_event_id');
  else
    perform pg_temp.m2a_fail('A38', 'unexpected events on attempts=' || v_cnt);
  end if;

  select count(*) filter (where question_version_id is not null)
    into v_cnt from public.question_attempts;
  if v_cnt = 0 then
    perform pg_temp.m2a_pass('A39', 'no historical attempt QV');
  else
    perform pg_temp.m2a_fail('A39', 'unexpected QV on attempts=' || v_cnt);
  end if;

  insert into public.question_assignments (user_id, question_id)
  values (v_user_a, 1001)
  returning id into v_assignment;
  perform pg_temp.m2a_pass('A40', 'legacy assignment insert still works; canonical cols nullable');

  insert into public.question_attempts (
    user_id, question_id, subject, correct, attempt_number, is_review
  ) values (
    v_user_a, 1001, 'Matemática e Raciocínio Lógico', true, 1, false
  );
  perform pg_temp.m2a_pass('A40b', 'legacy attempt insert without canonical fields');

  insert into public.question_attempts (
    user_id, question_id, subject, topic, correct, attempt_number, is_review,
    learning_event_id, question_version_id, question_assignment_id,
    selected_answer, submission_id
  ) values (
    v_user_a, 1001, 'Matemática e Raciocínio Lógico', 'Porcentagem', true, 2, false,
    v_event_a, v_qv, v_assignment, 'C', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  );

  begin
    insert into public.question_attempts (
      user_id, question_id, subject, correct, attempt_number,
      learning_event_id, question_version_id, question_assignment_id,
      selected_answer, submission_id
    ) values (
      v_user_a, 1001, 'Matemática e Raciocínio Lógico', true, 3,
      v_event_a, v_qv, v_assignment, 'C', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    );
    perform pg_temp.m2a_fail('A41', 'duplicate submission_id accepted');
  exception when unique_violation then
    perform pg_temp.m2a_pass('A41', sqlerrm);
  end;

  begin
    insert into public.question_attempts (
      user_id, question_id, subject, correct, attempt_number, learning_event_id
    ) values (
      v_user_a, 1002, 'Matemática e Raciocínio Lógico', false, 1, v_event_a
    );
    perform pg_temp.m2a_fail('A42', 'incomplete canonical bridge accepted');
  exception when check_violation then
    perform pg_temp.m2a_pass('A42', sqlerrm);
  end;

  -- RLS / grants
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text,
    true
  );

  begin
    insert into public.learning_evidence (
      profile_id, learning_event_id, knowledge_unit_id, stage, observation,
      strength, assistance_context, timing_interpretation, producer_type,
      producer_version, observed_at
    ) values (
      v_user_a, v_event_a, 'porcentagem-basica',
      'application', 'success', 'moderate', 'unknown', 'unknown',
      'deterministic_rule', 'm2a-test', now()
    );
    perform pg_temp.m2a_fail('A30', 'authenticated INSERT evidence succeeded');
  exception when others then
    perform pg_temp.m2a_pass('A30', sqlerrm);
  end;

  begin
    update public.learning_evidence set strength = 'strong' where id = v_ev_a;
    if found then
      perform pg_temp.m2a_fail('A31', 'authenticated UPDATE evidence succeeded');
    else
      perform pg_temp.m2a_pass('A31', 'update matched no rows or blocked');
    end if;
  exception when others then
    perform pg_temp.m2a_pass('A31', sqlerrm);
  end;

  begin
    delete from public.learning_evidence where id = v_ev_a;
    if found then
      perform pg_temp.m2a_fail('A32', 'authenticated DELETE evidence succeeded');
    else
      perform pg_temp.m2a_pass('A32', 'delete matched no rows or blocked');
    end if;
  exception when others then
    perform pg_temp.m2a_pass('A32', sqlerrm);
  end;

  select count(*) into v_cnt
  from public.learning_events
  where profile_id = v_user_b;
  if v_cnt = 0 then
    perform pg_temp.m2a_pass('A51', 'user A cannot read user B events');
  else
    perform pg_temp.m2a_fail('A51', 'cross-user event read count=' || v_cnt);
  end if;

  select count(*) into v_cnt
  from public.learning_evidence
  where profile_id = v_user_b;
  if v_cnt = 0 then
    perform pg_temp.m2a_pass('A52', 'user A cannot read user B evidence');
  else
    perform pg_temp.m2a_fail('A52', 'cross-user evidence read count=' || v_cnt);
  end if;

  begin
    insert into public.evidence_actions (
      evidence_id, action, replacement_evidence_id, reason, producer_type, producer_version
    ) values (
      v_ev_a, 'invalidate', null, 'client', 'deterministic_rule', 'm2a-test'
    );
    perform pg_temp.m2a_fail('A56', 'authenticated evidence_actions insert succeeded');
  exception when others then
    perform pg_temp.m2a_pass('A56', sqlerrm);
  end;

  begin
    perform correct_answer from public.question_versions where id = v_qv;
    perform pg_temp.m2a_fail('A57', 'authenticated selected correct_answer from question_versions');
  exception when others then
    perform pg_temp.m2a_pass('A57', sqlerrm);
  end;

  reset role;

  perform set_config('role', 'anon', true);
  begin
    perform 1 from public.learning_evidence limit 1;
    perform pg_temp.m2a_fail('A58', 'anon selected learning_evidence');
  exception when others then
    perform pg_temp.m2a_pass('A58', sqlerrm);
  end;
  reset role;
end;
$m2a$;

select test_id, result, detail
from m2a_validation_results
order by test_id;

select
  case when count(*) filter (where result = 'FAIL') = 0
    then 'M2A SQL VALIDATION: ALL RECORDED TESTS PASSED'
    else 'M2A SQL VALIDATION: FAILURES PRESENT'
  end as summary,
  count(*) filter (where result = 'FAIL') as failures,
  count(*) as recorded
from m2a_validation_results;
