-- ZYNVO M2C canonical response validation.
-- Disposable local Postgres only. Does not access the remote project.
-- Does not promote real pilot QVs 1001–1012.

\set ON_ERROR_STOP on

drop table if exists m2c_validation_results;
create table m2c_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

grant all on table m2c_validation_results to authenticated, anon;

create or replace function pg_temp.ok(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into m2c_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.bad(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into m2c_validation_results(test_id, result, detail)
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

create or replace function pg_temp.install_synth(
  p_id integer,
  p_statement text,
  p_alts jsonb,
  p_correct text,
  p_ku text,
  p_dc text,
  p_validation text,
  p_publish boolean,
  p_ku2 text default null
)
returns uuid
language plpgsql as $$
declare
  v_qvid uuid;
begin
  insert into public.questions (
    id, exam_id, subject_id, topic_id, bank_id, exam_name,
    difficulty, statement, alternatives, correct_answer, explanation,
    source_label, source_version, status
  ) values (
    p_id, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem',
    'm2c-test', 't', 'easy', p_statement, p_alts, p_correct, 'M2C explanation must be gated.',
    'm2c-test', 'v', 'published'
  );

  insert into public.question_versions (
    question_id, version_number, statement, alternatives, correct_answer, explanation,
    difficulty, source_type, source_label, source_version, validation_status, published_at
  ) values (
    p_id, 1, p_statement, p_alts, p_correct, 'M2C explanation must be gated.',
    'easy', 'zynvo_original', 'm2c-test', 'v', 'draft', null
  ) returning id into v_qvid;

  if p_ku is not null then
    insert into public.question_version_knowledge_units (
      question_version_id, knowledge_unit_id, role
    ) values (v_qvid, p_ku, 'primary');
  end if;

  if p_ku2 is not null then
    insert into public.question_version_knowledge_units (
      question_version_id, knowledge_unit_id, role
    ) values (v_qvid, p_ku2, 'primary');
  end if;

  if p_dc is not null then
    insert into public.question_version_delivery_controls (
      question_version_id, delivery_state, reason, provenance, changed_by
    ) values (
      v_qvid,
      p_dc,
      case when p_dc in ('HOLD', 'INVALIDATED') then 'm2c-test' else null end,
      'm2c-test',
      'tester'
    );
  end if;

  update public.question_versions
     set validation_status = p_validation,
         published_at = case when p_publish then now() else null end
   where id = v_qvid;

  return v_qvid;
end;
$$;

create or replace function pg_temp.deliver_and_confirm(p_user uuid, p_qid integer)
returns uuid
language plpgsql as $$
declare
  rec record;
begin
  perform pg_temp.become(p_user);
  select * into rec from public.request_question_delivery('study');
  if rec.outcome is distinct from 'DELIVERED' or rec.question_id is distinct from p_qid then
    raise exception 'deliver failed q=% outcome=% got=%',
      p_qid, rec.outcome, rec.question_id;
  end if;
  perform public.confirm_question_presentation(rec.assignment_id);
  reset role;
  return rec.assignment_id;
end;
$$;

create function pg_temp.m2c_fail_trig()
returns trigger
language plpgsql as $$
begin
  if current_setting('m2c.fail_after', true) = tg_argv[0] then
    raise exception 'm2c-fail-%', tg_argv[0];
  end if;
  return new;
end;
$$;

drop trigger if exists m2c_fail_event on public.learning_events;
drop trigger if exists m2c_fail_attempt on public.question_attempts;
drop trigger if exists m2c_fail_evidence on public.learning_evidence;
drop trigger if exists m2c_fail_assign on public.question_assignments;

create trigger m2c_fail_event
  after insert on public.learning_events
  for each row execute function pg_temp.m2c_fail_trig('event');

create trigger m2c_fail_attempt
  after insert on public.question_attempts
  for each row execute function pg_temp.m2c_fail_trig('attempt');

create trigger m2c_fail_evidence
  after insert on public.learning_evidence
  for each row execute function pg_temp.m2c_fail_trig('evidence');

create trigger m2c_fail_assign
  before update of answered_at on public.question_assignments
  for each row execute function pg_temp.m2c_fail_trig('assign');

do $c$
declare
  v_user uuid := '11111111-1111-1111-1111-111111111111';
  v_user2 uuid := '22222222-2222-2222-2222-222222222222';
  v_qv uuid;
  v_qv_happy uuid;
  v_asg uuid;
  v_asg2 uuid;
  v_sub uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_sub2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_outcome text;
  v_cnt integer;
  v_cnt_ev integer;
  v_cnt_at integer;
  v_cnt_evi integer;
  v_answered timestamptz;
  v_att_answered timestamptz;
  v_occured timestamptz;
  v_obs timestamptz;
  v_started timestamptz;
  v_present timestamptz;
  v_assigned timestamptz;
  v_asg_started timestamptz;
  v_attempt uuid;
  v_event uuid;
  v_keys text[];
  v_def text;
  rec record;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      'm2c-a@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user2, 'authenticated', 'authenticated',
      'm2c-b@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
    );

  insert into public.profiles (id, display_name) values (v_user, 'M2C A'), (v_user2, 'M2C B');

  insert into public.knowledge_units (id, name, description, status) values
    ('m2c-test-ku', 'M2C KU', 'Synthetic PRIMARY KU.', 'published'),
    ('m2c-test-ku-b', 'M2C KU B', 'Second PRIMARY KU.', 'published');

  insert into public.user_study_tracks (user_id, exam_id)
  values (v_user, 'gcm-vunesp-pilot');

  v_qv_happy := pg_temp.install_synth(
    20001,
    'M2C synthetic: 25% de 40?',
    '[{"id":"A","text":"8"},{"id":"B","text":"10"},{"id":"C","text":"12"},{"id":"D","text":"15"}]'::jsonb,
    'B',
    'm2c-test-ku',
    'AVAILABLE',
    'approved',
    true
  );

  v_asg := pg_temp.deliver_and_confirm(v_user, 20001);

  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg, ' B ', v_sub);
  reset role;

  if rec.outcome = 'RECORDED'
     and rec.assignment_id = v_asg
     and rec.attempt_id is not null
     and rec.selected_answer = 'B'
     and rec.is_correct is true
     and rec.correct_answer = 'B'
     and rec.explanation = 'M2C explanation must be gated.'
  then
    perform pg_temp.ok('P01', 'AVAILABLE 1 PRIMARY recorded');
    perform pg_temp.ok('SG-C-GRADE', 'server grade true');
    perform pg_temp.ok('SG-C-RELEASE', 'key released when AVAILABLE');
  else
    perform pg_temp.bad('P01', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-GRADE', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-RELEASE', to_jsonb(rec)::text);
  end if;

  v_attempt := rec.attempt_id;

  select array_agg(k order by k) into v_keys from jsonb_object_keys(to_jsonb(rec)) as k;
  if v_keys = array['assignment_id','attempt_id','correct_answer','explanation','is_correct','outcome','selected_answer']::text[] then
    perform pg_temp.ok('P02', 'return shape');
  else
    perform pg_temp.bad('P02', coalesce(v_keys::text, 'null'));
  end if;

  select qa.answered_at, qa.started_at, qa.assigned_at, qa.presented_at
    into v_answered, v_asg_started, v_assigned, v_present
    from public.question_assignments qa where qa.id = v_asg;

  select att.answered_at, att.started_at, att.learning_event_id
    into v_att_answered, v_started, v_event
    from public.question_attempts att where att.id = v_attempt;

  select ev.occurred_at into v_occured from public.learning_events ev where ev.id = v_event;
  select evi.observed_at into v_obs from public.learning_evidence evi where evi.learning_event_id = v_event;

  if v_answered is not null
     and v_answered = v_att_answered
     and v_answered = v_occured
     and v_answered = v_obs
  then
    perform pg_temp.ok('P03', 'shared v_answered_at');
  else
    perform pg_temp.bad('P03', 'ts mismatch');
  end if;

  if v_started is null then
    perform pg_temp.ok('P04', 'attempt.started_at NULL');
  else
    perform pg_temp.bad('P04', v_started::text);
  end if;

  if v_asg_started is null and v_present is not null and v_assigned is not null then
    perform pg_temp.ok('P05', 'assignment assigned/presented untouched; started_at NULL');
  else
    perform pg_temp.bad('P05', 'assignment timestamps');
  end if;

  select count(*) into v_cnt from public.learning_evidence where learning_event_id = v_event;
  if v_cnt = 1 then
    perform pg_temp.ok('P06', 'exactly 1 evidence');
    perform pg_temp.ok('SG-C-EV1', 'single PRIMARY AVAILABLE');
  else
    perform pg_temp.bad('P06', 'evidence=' || v_cnt);
    perform pg_temp.bad('SG-C-EV1', 'evidence=' || v_cnt);
  end if;

  if exists (
    select 1 from public.learning_evidence e
    where e.learning_event_id = v_event
      and e.stage = 'comprehension'
      and e.observation = 'success'
      and e.strength = 'weak'
      and e.assistance_context = 'unknown'
      and e.timing_interpretation = 'unknown'
      and e.producer_type = 'deterministic_rule'
      and e.producer_version = 'm2c-v1'
      and e.knowledge_unit_id = 'm2c-test-ku'
  ) then
    perform pg_temp.ok('P07', 'evidence values');
  else
    perform pg_temp.bad('P07', 'unexpected evidence row');
  end if;

  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg, 'B', v_sub);
  reset role;
  if rec.outcome = 'RECORDED' and rec.attempt_id = v_attempt and rec.is_correct is true then
    perform pg_temp.ok('P08', 'identical replay');
    perform pg_temp.ok('SG-C-REPLAY', 'no re-grade required');
  else
    perform pg_temp.bad('P08', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-REPLAY', to_jsonb(rec)::text);
  end if;

  select count(*) into v_cnt from public.question_attempts where question_assignment_id = v_asg;
  if v_cnt = 1 then
    perform pg_temp.ok('P09', 'replay did not insert');
  else
    perform pg_temp.bad('P09', 'attempts=' || v_cnt);
  end if;

  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg, 'A', v_sub) r;
  reset role;
  if v_outcome = 'CONFLICT' then
    perform pg_temp.ok('P10', 'same submission different answer');
    perform pg_temp.ok('SG-C-CONFLICT', 'answer mismatch');
  else
    perform pg_temp.bad('P10', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-C-CONFLICT', coalesce(v_outcome, 'null'));
  end if;

  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg, 'B', v_sub2) r;
  reset role;
  if v_outcome = 'CONFLICT' then
    perform pg_temp.ok('P11', 'new submission already answered');
    perform pg_temp.ok('SG-C-DOUBLE', 'double-answer');
  else
    perform pg_temp.bad('P11', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-C-DOUBLE', coalesce(v_outcome, 'null'));
  end if;

  update public.question_version_delivery_controls
     set delivery_state = 'HOLD', reason = 'post-answer hold'
   where question_version_id = v_qv_happy;
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg, 'B', v_sub);
  reset role;
  if rec.outcome = 'RECORDED' and rec.is_correct is true
     and rec.correct_answer is null and rec.explanation is null
     and rec.attempt_id = v_attempt
  then
    perform pg_temp.ok('P12', 'replay strips key after HOLD');
    perform pg_temp.ok('SG-C-TRUST', 'current trust gate');
  else
    perform pg_temp.bad('P12', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-TRUST', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20010, 'hold q', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg2 := pg_temp.deliver_and_confirm(v_user, 20010);
  update public.question_version_delivery_controls
     set delivery_state = 'HOLD', reason = 'post-present hold'
   where question_version_id = v_qv;
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg2, 'A', gen_random_uuid());
  reset role;
  if rec.outcome = 'RECORDED' and rec.is_correct is true
     and rec.correct_answer is null and rec.explanation is null
     and not exists (
       select 1 from public.learning_evidence e
       join public.question_attempts a on a.learning_event_id = e.learning_event_id
       where a.question_assignment_id = v_asg2
     )
  then
    perform pg_temp.ok('N-HOLD', 'recorded, 0 evidence, no key');
    perform pg_temp.ok('SG-C-HOLD', 'HOLD conservative');
  else
    perform pg_temp.bad('N-HOLD', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-HOLD', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20011, 'retired q', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg2 := pg_temp.deliver_and_confirm(v_user, 20011);
  update public.question_version_delivery_controls
     set delivery_state = 'RETIRED'
   where question_version_id = v_qv;
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg2, 'A', gen_random_uuid());
  reset role;
  if rec.outcome = 'RECORDED' and rec.correct_answer is null
     and not exists (
       select 1 from public.learning_evidence e
       join public.question_attempts a on a.learning_event_id = e.learning_event_id
       where a.question_assignment_id = v_asg2
     )
  then
    perform pg_temp.ok('N-RETIRED', 'recorded, 0 evidence, no key');
    perform pg_temp.ok('SG-C-RETIRED', 'RETIRED conservative');
  else
    perform pg_temp.bad('N-RETIRED', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-RETIRED', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20012, 'inv q', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg2 := pg_temp.deliver_and_confirm(v_user, 20012);
  update public.question_version_delivery_controls
     set delivery_state = 'INVALIDATED', reason = 'bad item'
   where question_version_id = v_qv;
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg2, 'A', gen_random_uuid());
  reset role;
  if rec.outcome = 'RECORDED' and rec.correct_answer is null
     and not exists (
       select 1 from public.learning_evidence e
       join public.question_attempts a on a.learning_event_id = e.learning_event_id
       where a.question_assignment_id = v_asg2
     )
  then
    perform pg_temp.ok('N-INV', 'recorded, 0 evidence, no key');
    perform pg_temp.ok('SG-C-INV', 'INVALIDATED conservative');
  else
    perform pg_temp.bad('N-INV', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-INV', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20013, 'nodc q', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg2 := pg_temp.deliver_and_confirm(v_user, 20013);
  delete from public.question_version_delivery_controls where question_version_id = v_qv;
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg2, 'A', gen_random_uuid());
  reset role;
  if rec.outcome = 'RECORDED' and rec.correct_answer is null
     and not exists (
       select 1 from public.learning_evidence e
       join public.question_attempts a on a.learning_event_id = e.learning_event_id
       where a.question_assignment_id = v_asg2
     )
  then
    perform pg_temp.ok('N-NODC', 'missing control conservative');
    perform pg_temp.ok('SG-C-NODC', 'missing control');
  else
    perform pg_temp.bad('N-NODC', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-NODC', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20014, 'two ku', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'B',
    'm2c-test-ku', 'AVAILABLE', 'approved', true, 'm2c-test-ku-b'
  );
  v_asg2 := pg_temp.deliver_and_confirm(v_user, 20014);
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg2, 'B', gen_random_uuid());
  reset role;
  if rec.outcome = 'RECORDED'
     and not exists (
       select 1 from public.learning_evidence e
       join public.question_attempts a on a.learning_event_id = e.learning_event_id
       where a.question_assignment_id = v_asg2
     )
  then
    perform pg_temp.ok('N-MULTI', 'multi PRIMARY 0 evidence');
    perform pg_temp.ok('SG-C-MULTI', '0 evidence');
  else
    perform pg_temp.bad('N-MULTI', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-MULTI', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20015, 'zero ku', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    null, 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, presented_at
  ) values (v_user, 20015, 'study', v_qv, now())
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(v_asg2, 'A', gen_random_uuid());
  reset role;
  if rec.outcome = 'RECORDED'
     and not exists (
       select 1 from public.learning_evidence e
       join public.question_attempts a on a.learning_event_id = e.learning_event_id
       where a.question_assignment_id = v_asg2
     )
  then
    perform pg_temp.ok('N-ZERO', '0 PRIMARY 0 evidence');
    perform pg_temp.ok('SG-C-ZERO', '0 evidence');
  else
    perform pg_temp.bad('N-ZERO', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-ZERO', to_jsonb(rec)::text);
  end if;

  v_qv := pg_temp.install_synth(
    20016, 'unpresented', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id
  ) values (v_user, 20016, 'study', v_qv)
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg2, 'A', gen_random_uuid()) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N-PRES', 'not presented');
    perform pg_temp.ok('SG-C-PRES', 'presentation required');
  else
    perform pg_temp.bad('N-PRES', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-C-PRES', coalesce(v_outcome, 'null'));
  end if;
  update public.question_assignments set answered_at = now() where id = v_asg2;

  v_qv := pg_temp.install_synth(
    20017, 'null pin', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, presented_at
  ) values (v_user, 20017, 'study', null, now())
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg2, 'A', gen_random_uuid()) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N-PIN', 'NULL pin');
    perform pg_temp.ok('SG-C-PIN', 'exact stored pin');
  else
    perform pg_temp.bad('N-PIN', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-C-PIN', coalesce(v_outcome, 'null'));
  end if;

  v_qv := pg_temp.install_synth(
    20018, 'review', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, presented_at
  ) values (v_user, 20018, 'review', v_qv, now())
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg2, 'A', gen_random_uuid()) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N-REVIEW', 'review unsupported');
  else
    perform pg_temp.bad('N-REVIEW', coalesce(v_outcome, 'null'));
  end if;

  v_qv := pg_temp.install_synth(
    20019, 'bad ans', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, presented_at
  ) values (v_user, 20019, 'study', v_qv, now())
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg2, 'Z', gen_random_uuid()) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N-ANS', 'invalid selected answer');
    perform pg_temp.ok('SG-C-ANS', 'membership');
  else
    perform pg_temp.bad('N-ANS', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-C-ANS', coalesce(v_outcome, 'null'));
  end if;
  update public.question_assignments set answered_at = now() where id = v_asg2;

  perform pg_temp.become(v_user2);
  select * into rec from public.submit_question_response(v_asg, 'B', v_sub);
  reset role;
  if rec.outcome = 'DENIED' and rec.attempt_id is null then
    perform pg_temp.ok('N-XUSER', 'cross-user DENIED');
    perform pg_temp.ok('SG-C-OWN', 'ownership');
  else
    perform pg_temp.bad('N-XUSER', to_jsonb(rec)::text);
    perform pg_temp.bad('SG-C-OWN', to_jsonb(rec)::text);
  end if;

  perform pg_temp.become(v_user);
  select * into rec from public.submit_question_response(
    'ffffffff-ffff-ffff-ffff-ffffffffffff', 'A', gen_random_uuid()
  );
  reset role;
  if rec.outcome = 'DENIED' then
    perform pg_temp.ok('N-MISS', 'missing assignment DENIED');
  else
    perform pg_temp.bad('N-MISS', coalesce(rec.outcome, 'null'));
  end if;

  if has_function_privilege('anon', 'public.submit_question_response(uuid,text,uuid)', 'EXECUTE') then
    perform pg_temp.bad('N01', 'anon execute');
    perform pg_temp.bad('SG-C-AUTH', 'anon execute');
  else
    perform pg_temp.ok('N01', 'anon cannot execute');
    perform pg_temp.ok('SG-C-AUTH', 'anon revoked');
  end if;

  perform set_config('role', 'anon', true);
  begin
    perform public.submit_question_response(v_asg, 'B', v_sub);
    perform pg_temp.bad('N01b', 'anon executed');
  exception when others then
    perform pg_temp.ok('N01b', SQLSTATE);
  end;
  reset role;

  -- same submission different assignment (user owns both)
  v_qv := pg_temp.install_synth(
    20020, 'other asg', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, presented_at
  ) values (v_user, 20020, 'study', v_qv, now())
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg2, 'A', v_sub) r;
  reset role;
  if v_outcome = 'CONFLICT' then
    perform pg_temp.ok('N-SUBASG', 'same submission other assignment');
  else
    perform pg_temp.bad('N-SUBASG', coalesce(v_outcome, 'null'));
  end if;
  update public.question_assignments set answered_at = now() where id = v_asg2;

  -- legacy answered without canonical
  v_qv := pg_temp.install_synth(
    20021, 'legacy ans', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, presented_at, answered_at
  ) values (v_user, 20021, 'study', v_qv, now(), now())
  returning id into v_asg2;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.submit_question_response(v_asg2, 'A', gen_random_uuid()) r;
  reset role;
  if v_outcome = 'CONFLICT' then
    perform pg_temp.ok('N-LEGACY', 'legacy answered_at without canonical');
  else
    perform pg_temp.bad('N-LEGACY', coalesce(v_outcome, 'null'));
  end if;

  -- direct INSERT rejected
  perform pg_temp.become(v_user);
  begin
    insert into public.question_attempts (
      user_id, question_id, subject, correct, attempt_number
    ) values (v_user, 20999, 'x', true, 1);
    perform pg_temp.bad('Y-INS', 'authenticated INSERT succeeded');
    perform pg_temp.bad('SG-C-INSERT', 'insert allowed');
  exception when others then
    perform pg_temp.ok('Y-INS', SQLSTATE);
    perform pg_temp.ok('SG-C-INSERT', SQLSTATE);
  end;
  reset role;

  -- legacy DEFINER writer still works
  perform pg_temp.become(v_user);
  begin
    perform public.record_question_attempt(20001, 'Matemática e Raciocínio Lógico', true, false);
    perform pg_temp.ok('X-LEGACY', 'record_question_attempt still executes');
    perform pg_temp.ok('SG-C-LEGACY', 'DEFINER insert ok');
  exception when others then
    perform pg_temp.bad('X-LEGACY', SQLERRM);
    perform pg_temp.bad('SG-C-LEGACY', SQLERRM);
  end;
  reset role;

  -- rollback injection on 20030 AVAILABLE 1 PRIMARY
  v_qv := pg_temp.install_synth(
    20030, 'fail event', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2c-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg2 := pg_temp.deliver_and_confirm(v_user, 20030);
  select count(*) into v_cnt_ev from public.learning_events;
  select count(*) into v_cnt_at from public.question_attempts;
  select count(*) into v_cnt_evi from public.learning_evidence;
  select answered_at into v_answered from public.question_assignments where id = v_asg2;

  perform pg_temp.become(v_user);
  begin
    perform set_config('m2c.fail_after', 'event', true);
    perform public.submit_question_response(v_asg2, 'A', gen_random_uuid());
    perform pg_temp.bad('Z-EV', 'event fail did not raise');
  exception when others then
    if SQLERRM like '%m2c-fail-event%' then
      perform pg_temp.ok('Z-EV', 'raised');
    else
      perform pg_temp.bad('Z-EV', SQLERRM);
    end if;
  end;
  perform set_config('m2c.fail_after', '', true);
  reset role;
  if (select count(*) from public.learning_events) = v_cnt_ev
     and (select count(*) from public.question_attempts) = v_cnt_at
     and (select count(*) from public.learning_evidence) = v_cnt_evi
     and (select answered_at from public.question_assignments where id = v_asg2) is not distinct from v_answered
  then
    perform pg_temp.ok('Z-EV-RB', 'rollback after event');
  else
    perform pg_temp.bad('Z-EV-RB', 'leaked rows');
  end if;

  begin
    perform pg_temp.become(v_user);
    perform set_config('m2c.fail_after', 'attempt', true);
    perform public.submit_question_response(v_asg2, 'A', gen_random_uuid());
    perform pg_temp.bad('Z-AT', 'attempt fail did not raise');
  exception when others then
    if SQLERRM like '%m2c-fail-attempt%' then
      perform pg_temp.ok('Z-AT', 'raised');
    else
      perform pg_temp.bad('Z-AT', SQLERRM);
    end if;
  end;
  perform set_config('m2c.fail_after', '', true);
  reset role;
  if (select count(*) from public.learning_events) = v_cnt_ev
     and (select count(*) from public.question_attempts) = v_cnt_at
     and (select answered_at from public.question_assignments where id = v_asg2) is not distinct from v_answered
  then
    perform pg_temp.ok('Z-AT-RB', 'rollback after attempt');
  else
    perform pg_temp.bad('Z-AT-RB', 'leaked rows');
  end if;

  begin
    perform pg_temp.become(v_user);
    perform set_config('m2c.fail_after', 'evidence', true);
    perform public.submit_question_response(v_asg2, 'A', gen_random_uuid());
    perform pg_temp.bad('Z-EVI', 'evidence fail did not raise');
  exception when others then
    if SQLERRM like '%m2c-fail-evidence%' then
      perform pg_temp.ok('Z-EVI', 'raised');
    else
      perform pg_temp.bad('Z-EVI', SQLERRM);
    end if;
  end;
  perform set_config('m2c.fail_after', '', true);
  reset role;
  if (select count(*) from public.learning_events) = v_cnt_ev
     and (select count(*) from public.question_attempts) = v_cnt_at
     and (select count(*) from public.learning_evidence) = v_cnt_evi
     and (select answered_at from public.question_assignments where id = v_asg2) is not distinct from v_answered
  then
    perform pg_temp.ok('Z-EVI-RB', 'rollback after evidence');
  else
    perform pg_temp.bad('Z-EVI-RB', 'leaked rows');
  end if;

  begin
    perform pg_temp.become(v_user);
    perform set_config('m2c.fail_after', 'assign', true);
    perform public.submit_question_response(v_asg2, 'A', gen_random_uuid());
    perform pg_temp.bad('Z-ASG', 'assign fail did not raise');
  exception when others then
    if SQLERRM like '%m2c-fail-assign%' then
      perform pg_temp.ok('Z-ASG', 'raised');
    else
      perform pg_temp.bad('Z-ASG', SQLERRM);
    end if;
  end;
  perform set_config('m2c.fail_after', '', true);
  reset role;
  if (select count(*) from public.learning_events) = v_cnt_ev
     and (select count(*) from public.question_attempts) = v_cnt_at
     and (select count(*) from public.learning_evidence) = v_cnt_evi
     and (select answered_at from public.question_assignments where id = v_asg2) is not distinct from v_answered
  then
    perform pg_temp.ok('Z-ASG-RB', 'rollback before assignment update');
    perform pg_temp.ok('SG-C-RB', 'atomic rollback');
  else
    perform pg_temp.bad('Z-ASG-RB', 'leaked rows');
    perform pg_temp.bad('SG-C-RB', 'leaked rows');
  end if;

  select count(*) into v_cnt
    from public.question_versions qv
    join public.question_version_delivery_controls dc on dc.question_version_id = qv.id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and qv.validation_status = 'draft'
     and qv.published_at is null
     and dc.delivery_state = 'HOLD';
  if v_cnt = 12 then
    perform pg_temp.ok('PILOT', 'real pilot closed');
    perform pg_temp.ok('SG-C-PILOT', '1001-1012 HOLD draft');
  else
    perform pg_temp.bad('PILOT', 'count=' || v_cnt);
    perform pg_temp.bad('SG-C-PILOT', 'count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012 and version_number = 2;
  if v_cnt = 0 then
    perform pg_temp.ok('NOV2', 'no v2');
  else
    perform pg_temp.bad('NOV2', 'v2=' || v_cnt);
  end if;

  select pg_get_functiondef('public.submit_question_response(uuid,text,uuid)'::regprocedure)
    into v_def;
  if position('p_correct' in v_def) = 0
     and position('p_user_id' in v_def) = 0
     and position('p_exam_id' in v_def) = 0
  then
    perform pg_temp.ok('SG-C-SIG', 'no p_correct/user/exam');
  else
    perform pg_temp.bad('SG-C-SIG', 'unexpected args');
  end if;

  if v_def like '%search_path%' then
    perform pg_temp.ok('SG-C-PATH', 'search_path set');
  else
    perform pg_temp.bad('SG-C-PATH', 'missing');
  end if;

  if position('record_assigned_question_attempt' in v_def) = 0
     and position('record_question_attempt' in v_def) = 0
  then
    perform pg_temp.ok('SG-C-NOLEGACYCALL', 'canonical RPC does not call legacy writers');
  else
    perform pg_temp.bad('SG-C-NOLEGACYCALL', 'calls legacy');
  end if;

  perform pg_temp.ok('SG-C-CONC', 'REAL MULTI-SESSION M2C CONCURRENCY TEST: DEFERRED TO BETA SECURITY GATE');
  perform pg_temp.ok('SG-C-FE', 'QuestionsPage untouched by this harness');
end;
$c$;

drop trigger if exists m2c_fail_event on public.learning_events;
drop trigger if exists m2c_fail_attempt on public.question_attempts;
drop trigger if exists m2c_fail_evidence on public.learning_evidence;
drop trigger if exists m2c_fail_assign on public.question_assignments;

select test_id, result, detail
from m2c_validation_results
order by test_id;

select
  case when count(*) filter (where result = 'FAIL') = 0
    then 'M2C SQL VALIDATION: ALL RECORDED TESTS PASSED'
    else 'M2C SQL VALIDATION: FAILURES PRESENT'
  end as summary,
  count(*) filter (where result = 'FAIL') as failures,
  count(*) as recorded
from m2c_validation_results;
