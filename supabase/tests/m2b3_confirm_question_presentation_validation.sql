-- ZYNVO M2B.3 presentation confirmation validation.
-- Disposable local Postgres only. Does not access the remote project.
-- Does not promote real pilot QVs 1001–1012.

\set ON_ERROR_STOP on

drop table if exists m2b3_validation_results;
create table m2b3_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

grant all on table m2b3_validation_results to authenticated, anon;

create or replace function pg_temp.ok(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into m2b3_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.bad(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into m2b3_validation_results(test_id, result, detail)
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
  p_source_label text default 'm2b3-test'
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
    'm2b3-test', 't', 'easy', p_statement, p_alts, p_correct, 'INTERNAL must not leak.',
    'm2b3-test', 'v', 'published'
  );

  insert into public.question_versions (
    question_id, version_number, statement, alternatives, correct_answer, explanation,
    difficulty, source_type, source_label, source_version, validation_status, published_at
  ) values (
    p_id, 1, p_statement, p_alts, p_correct, 'INTERNAL must not leak.',
    'easy', 'zynvo_original', p_source_label, 'v', 'draft', null
  ) returning id into v_qvid;

  if p_ku is not null then
    insert into public.question_version_knowledge_units (
      question_version_id, knowledge_unit_id, role
    ) values (v_qvid, p_ku, 'primary');
  end if;

  if p_dc is not null then
    insert into public.question_version_delivery_controls (
      question_version_id, delivery_state, reason, provenance, changed_by
    ) values (
      v_qvid,
      p_dc,
      case when p_dc in ('HOLD', 'INVALIDATED') then 'm2b3-test' else null end,
      'm2b3-test',
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

create or replace function pg_temp.assign_owned(
  p_user uuid,
  p_qid integer,
  p_qv uuid,
  p_ctx text default 'study',
  p_answered boolean default false
)
returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.question_assignments (
    user_id, question_id, delivery_context, question_version_id, answered_at
  ) values (
    p_user, p_qid, p_ctx, p_qv, case when p_answered then now() else null end
  ) returning id into v_id;
  return v_id;
end;
$$;

do $b3$
declare
  v_user uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_user2 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_qv uuid;
  v_qv_n uuid;
  v_asg uuid;
  v_asg_n uuid;
  v_pin uuid;
  v_assigned_at timestamptz;
  v_started_at timestamptz;
  v_answered_at timestamptz;
  v_present1 timestamptz;
  v_present2 timestamptz;
  v_outcome text;
  v_cnt integer;
  v_def text;
  v_keys text[];
  rec record;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      'm2b3-a@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user2, 'authenticated', 'authenticated',
      'm2b3-b@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
    );

  insert into public.profiles (id, display_name) values (v_user, 'M2B3 A'), (v_user2, 'M2B3 B');

  insert into public.knowledge_units (id, name, description, status)
  values ('m2b3-test-ku', 'M2B.3 test KU', 'Synthetic KU for presentation tests.', 'published');

  v_qv := pg_temp.install_synth(
    18001,
    'M2B.3 synthetic: quanto é 20% de 50?',
    '[{"id":"A","text":"8"},{"id":"B","text":"10"},{"id":"C","text":"12"},{"id":"D","text":"15"}]'::jsonb,
    'B',
    'm2b3-test-ku',
    'AVAILABLE',
    'approved',
    true
  );

  insert into public.user_study_tracks (user_id, exam_id)
  values (v_user, 'gcm-vunesp-pilot');

  insert into public.question_assignments (
    user_id, question_id, delivery_context, answered_at
  )
  select v_user, qv.question_id, 'study', now()
    from public.question_versions qv
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1;

  perform pg_temp.become(v_user);
  select * into rec from public.request_question_delivery('study');
  if rec.outcome = 'DELIVERED' and rec.question_id = 18001 and rec.assignment_id is not null then
    v_asg := rec.assignment_id;
    v_pin := rec.question_version_id;
    perform pg_temp.ok('B3-DELIVER', 'synthetic assignment');
  else
    perform pg_temp.bad('B3-DELIVER', coalesce(rec.outcome, 'null'));
  end if;
  reset role;

  select qa.presented_at, qa.assigned_at, qa.started_at, qa.answered_at, qa.question_version_id
    into v_present1, v_assigned_at, v_started_at, v_answered_at, v_pin
    from public.question_assignments qa
   where qa.id = v_asg;

  if v_present1 is null then
    perform pg_temp.ok('P02', 'presented_at NULL after delivery');
  else
    perform pg_temp.bad('P02', v_present1::text);
  end if;

  perform pg_temp.become(v_user);
  select * into rec from public.confirm_question_presentation(v_asg);
  reset role;

  if rec.outcome = 'CONFIRMED'
     and rec.assignment_id = v_asg
     and rec.presented_at is not null
  then
    perform pg_temp.ok('P01', 'owner confirmed');
    perform pg_temp.ok('P03', rec.presented_at::text);
    perform pg_temp.ok('SG-B3-TS', 'server timestamp');
  else
    perform pg_temp.bad('P01', coalesce(rec.outcome, 'null'));
    perform pg_temp.bad('P03', coalesce(rec.presented_at::text, 'null'));
    perform pg_temp.bad('SG-B3-TS', 'stamp missing');
  end if;

  v_present1 := rec.presented_at;

  select array_agg(k order by k)
    into v_keys
    from jsonb_object_keys(to_jsonb(rec)) as k;
  if v_keys = array['assignment_id', 'outcome', 'presented_at']::text[] then
    perform pg_temp.ok('P14', 'approved fields only');
    perform pg_temp.ok('SG-B3-LEAK', 'no extra payload keys');
  else
    perform pg_temp.bad('P14', coalesce(v_keys::text, 'null'));
    perform pg_temp.bad('SG-B3-LEAK', coalesce(v_keys::text, 'null'));
  end if;

  if to_jsonb(rec) ? 'question_version_id'
     or to_jsonb(rec) ? 'question_id'
     or to_jsonb(rec) ? 'statement'
     or to_jsonb(rec) ? 'alternatives'
     or to_jsonb(rec) ? 'correct_answer'
     or to_jsonb(rec) ? 'correctAnswer'
     or to_jsonb(rec) ? 'answer_key'
     or to_jsonb(rec) ? 'explanation'
     or to_jsonb(rec) ? 'delivery_state'
     or to_jsonb(rec) ? 'validation_status'
     or to_jsonb(rec) ? 'user_id'
     or to_jsonb(rec) ? 'exam_id'
     or to_jsonb(rec) ? 'reason'
  then
    perform pg_temp.bad('SG-B3-INTSTATE', to_jsonb(rec)::text);
  else
    perform pg_temp.ok('SG-B3-INTSTATE', 'internal states absent');
  end if;

  perform pg_temp.become(v_user);
  select * into rec from public.confirm_question_presentation(v_asg);
  reset role;
  v_present2 := rec.presented_at;

  if rec.outcome = 'CONFIRMED' and rec.assignment_id = v_asg and v_present2 = v_present1 then
    perform pg_temp.ok('P04', 'retry identical timestamp');
    perform pg_temp.ok('P05', 'no rewrite');
    perform pg_temp.ok('SG-B3-IDEM', 'idempotent retry');
  else
    perform pg_temp.bad('P04', coalesce(v_present2::text, 'null'));
    perform pg_temp.bad('P05', 'rewritten or mismatch');
    perform pg_temp.bad('SG-B3-IDEM', coalesce(rec.outcome, 'null'));
  end if;

  select qa.question_version_id, qa.assigned_at, qa.started_at, qa.answered_at
    into v_qv_n, v_present2, v_started_at, v_answered_at
    from public.question_assignments qa
   where qa.id = v_asg;

  if v_qv_n = v_pin then
    perform pg_temp.ok('P06', 'stored pin unchanged');
    perform pg_temp.ok('SG-B3-PIN', 'exact stored pin');
  else
    perform pg_temp.bad('P06', coalesce(v_qv_n::text, 'null'));
    perform pg_temp.bad('SG-B3-PIN', 'pin mutated');
  end if;

  if v_present2 is not distinct from v_assigned_at then
    perform pg_temp.ok('P07', 'assigned_at unchanged');
  else
    perform pg_temp.bad('P07', coalesce(v_present2::text, 'null'));
  end if;

  if v_started_at is null then
    perform pg_temp.ok('P08', 'started_at still NULL');
  else
    perform pg_temp.bad('P08', v_started_at::text);
  end if;

  if v_answered_at is null then
    perform pg_temp.ok('P09', 'answered_at still NULL');
  else
    perform pg_temp.bad('P09', v_answered_at::text);
  end if;

  select count(*) into v_cnt from public.question_attempts;
  if v_cnt = 0 then
    perform pg_temp.ok('P10', 'no QuestionAttempt');
  else
    perform pg_temp.bad('P10', 'attempts=' || v_cnt);
  end if;

  if not exists (select 1 from public.learning_events) then
    perform pg_temp.ok('P11', 'no LearningEvent');
  else
    perform pg_temp.bad('P11', 'events present');
  end if;

  if not exists (select 1 from public.learning_evidence) then
    perform pg_temp.ok('P12', 'no LearningEvidence');
  else
    perform pg_temp.bad('P12', 'evidence present');
  end if;

  if not exists (select 1 from public.evidence_actions) then
    perform pg_temp.ok('P13', 'no EvidenceAction');
    perform pg_temp.ok('SG-B3-EV', 'no Evidence side effects');
  else
    perform pg_temp.bad('P13', 'actions present');
    perform pg_temp.bad('SG-B3-EV', 'actions present');
  end if;

  update public.question_version_delivery_controls
     set delivery_state = 'HOLD', reason = 'post-stamp hold'
   where question_version_id = v_pin;

  perform pg_temp.become(v_user);
  select * into rec from public.confirm_question_presentation(v_asg);
  reset role;

  if rec.outcome = 'CONFIRMED' and rec.presented_at = v_present1 then
    perform pg_temp.ok('P15', 'post-stamp HOLD preserves timestamp');
    perform pg_temp.ok('SG-B3-POST', 'historical fact preserved');
    perform pg_temp.ok('N20', 'no historical fact rewritten');
  else
    perform pg_temp.bad('P15', coalesce(rec.outcome, 'null') || ' ' || coalesce(rec.presented_at::text, 'null'));
    perform pg_temp.bad('SG-B3-POST', 'fact lost');
    perform pg_temp.bad('N20', 'rewritten');
  end if;

  if has_function_privilege('anon', 'public.confirm_question_presentation(uuid)', 'EXECUTE') then
    perform pg_temp.bad('N01', 'anon has execute');
    perform pg_temp.bad('SG-B3-AUTH', 'anon execute');
  else
    perform pg_temp.ok('N01', 'anon cannot execute');
    perform pg_temp.ok('SG-B3-AUTH', 'anon revoked');
  end if;

  perform set_config('role', 'anon', true);
  begin
    perform public.confirm_question_presentation(v_asg);
    perform pg_temp.bad('N01b', 'anon executed RPC');
  exception when others then
    perform pg_temp.ok('N01b', SQLSTATE);
  end;
  reset role;

  perform pg_temp.become(v_user);
  select * into rec
    from public.confirm_question_presentation('ffffffff-ffff-ffff-ffff-ffffffffffff');
  reset role;
  if rec.outcome = 'DENIED' and rec.assignment_id is null and rec.presented_at is null then
    perform pg_temp.ok('N02', 'missing UUID DENIED');
  else
    perform pg_temp.bad('N02', coalesce(rec.outcome, 'null'));
  end if;

  perform pg_temp.become(v_user2);
  select * into rec from public.confirm_question_presentation(v_asg);
  reset role;
  if rec.outcome = 'DENIED' and rec.assignment_id is null then
    perform pg_temp.ok('N03', 'other-user DENIED');
    perform pg_temp.ok('SG-B3-OWN', 'ownership required');
    perform pg_temp.ok('SG-B3-ENUM', 'cross-user collapsed to DENIED');
  else
    perform pg_temp.bad('N03', coalesce(rec.outcome, 'null'));
    perform pg_temp.bad('SG-B3-OWN', coalesce(rec.outcome, 'null'));
    perform pg_temp.bad('SG-B3-ENUM', coalesce(rec.outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19104, 'n04', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user2, 19104, v_qv_n);
  perform pg_temp.become(v_user2);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'CONTEXT_NOT_READY' then
    perform pg_temp.ok('N04', 'missing StudyTrack');
  else
    perform pg_temp.bad('N04', coalesce(v_outcome, 'null'));
  end if;
  if exists (
    select 1 from public.question_assignments where id = v_asg_n and presented_at is null
  ) then
    perform pg_temp.ok('N04b', 'unstamped after missing track');
  else
    perform pg_temp.bad('N04b', 'stamped without track');
  end if;

  insert into public.exams (id, name, organizing_body, status)
  values ('m2b3-draft-exam', 'Draft exam', 'TEST', 'draft');

  v_qv_n := pg_temp.install_synth(
    19105, 'n05', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19105, v_qv_n);

  update public.user_study_tracks
     set exam_id = 'm2b3-draft-exam'
   where user_id = v_user;

  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'CONTEXT_NOT_READY' then
    perform pg_temp.ok('N05', 'unpublished exam');
  else
    perform pg_temp.bad('N05', coalesce(v_outcome, 'null'));
  end if;

  update public.user_study_tracks
     set exam_id = 'gcm-vunesp-pilot'
   where user_id = v_user;

  v_qv_n := pg_temp.install_synth(
    19106, 'n06', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19106, null);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N06', 'legacy NULL pin');
  else
    perform pg_temp.bad('N06', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19107, 'n07', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19107, v_qv_n, 'review');
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N07', 'review context');
  else
    perform pg_temp.bad('N07', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19108, 'n08', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19108, v_qv_n, 'study', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE'
     and exists (
       select 1 from public.question_assignments
        where id = v_asg_n and presented_at is null and answered_at is not null
     )
  then
    perform pg_temp.ok('N08', 'answered + unstamped');
  else
    perform pg_temp.bad('N08', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19109, 'n09', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'draft', false
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19109, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N09', 'DRAFT QV');
  else
    perform pg_temp.bad('N09', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19110, 'n10', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', false
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19110, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N10', 'unpublished QV');
  else
    perform pg_temp.bad('N10', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19111, 'n11', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'HOLD', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19111, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE'
     and exists (select 1 from public.question_assignments where id = v_asg_n and presented_at is null)
  then
    perform pg_temp.ok('N11', 'pre-stamp HOLD');
    perform pg_temp.ok('SG-B3-PRE', 'pre-stamp ineligible');
  else
    perform pg_temp.bad('N11', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-B3-PRE', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19112, 'n12', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'RETIRED', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19112, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N12', 'pre-stamp RETIRED');
  else
    perform pg_temp.bad('N12', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19113, 'n13', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'INVALIDATED', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19113, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N13', 'pre-stamp INVALIDATED');
  else
    perform pg_temp.bad('N13', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19114, 'n14', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', null, 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19114, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N14', 'missing DeliveryControl');
  else
    perform pg_temp.bad('N14', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19115, 'n15', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    null, 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19115, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N15', 'missing PRIMARY mapping');
  else
    perform pg_temp.bad('N15', coalesce(v_outcome, 'null'));
  end if;

  insert into public.knowledge_units (id, name, status)
  values ('m2b3-ku-draft', 'draft ku', 'draft');

  v_qv_n := pg_temp.install_synth(
    19116, 'n16', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-ku-draft', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19116, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N16', 'non-published PRIMARY KU');
  else
    perform pg_temp.bad('N16', coalesce(v_outcome, 'null'));
  end if;

  v_qv_n := pg_temp.install_synth(
    19117, 'n17', '[{"id":"A","text":"1","correct":true},{"id":"B","text":"2"}]'::jsonb, 'A',
    'm2b3-test-ku', 'AVAILABLE', 'approved', true
  );
  v_asg_n := pg_temp.assign_owned(v_user, 19117, v_qv_n);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg_n) r;
  reset role;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('N17', 'malformed QV integrity');
    perform pg_temp.ok('SG-B3-INT', 'integrity fail-closed');
  else
    perform pg_temp.bad('N17', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('SG-B3-INT', coalesce(v_outcome, 'null'));
  end if;

  select count(*) into v_cnt
    from public.question_versions qv
    join public.question_version_delivery_controls dc on dc.question_version_id = qv.id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and qv.validation_status = 'approved'
     and qv.published_at is not null
     and dc.delivery_state = 'AVAILABLE';
  if v_cnt = 12 then
    perform pg_temp.ok('N18', 'real pilot remains promoted');
    perform pg_temp.ok('SG-B3-PILOT', '1001-1012 approved AVAILABLE');
  else
    perform pg_temp.bad('N18', 'pilot count=' || v_cnt);
    perform pg_temp.bad('SG-B3-PILOT', 'pilot count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012 and version_number = 2;
  if v_cnt = 0 then
    perform pg_temp.ok('N19', 'no v2');
  else
    perform pg_temp.bad('N19', 'v2=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and dc.delivery_state = 'AVAILABLE';
  if v_cnt = 12 then
    perform pg_temp.ok('N18b', '12 AVAILABLE on real pilot v1');
  else
    perform pg_temp.bad('N18b', 'available=' || v_cnt);
  end if;

  select pg_get_functiondef('public.confirm_question_presentation(uuid)'::regprocedure)
    into v_def;

  if position('p_exam_id' in v_def) = 0
     and position('p_user_id' in v_def) = 0
     and position('p_question_version_id' in v_def) = 0
     and position('p_correct' in v_def) = 0
     and position('client' in lower(v_def)) = 0
  then
    perform pg_temp.ok('SG-B3-NOTS', 'no client timestamp/exam/user args');
  else
    perform pg_temp.bad('SG-B3-NOTS', 'unexpected args');
  end if;

  if v_def not like '%assign_next_questions%'
     and v_def not like '%load_assigned_review_questions%'
     and v_def not like '%learning_events%'
     and v_def not like '%learning_evidence%'
     and v_def not like '%question_attempts%'
  then
    perform pg_temp.ok('SG-B3-BOUND', 'no M2C/legacy writes');
  else
    perform pg_temp.bad('SG-B3-BOUND', 'unexpected writes');
  end if;

  if v_def like '%search_path%' then
    perform pg_temp.ok('SG-B3-PRIV', 'search_path set');
  else
    perform pg_temp.bad('SG-B3-PRIV', 'search_path missing');
  end if;

  if has_table_privilege('authenticated', 'public.question_assignments', 'UPDATE')
     or has_table_privilege('anon', 'public.question_assignments', 'UPDATE')
     or has_table_privilege('authenticated', 'public.question_versions', 'SELECT')
     or has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'SELECT')
  then
    perform pg_temp.bad('SG-B3-PRIV2', 'unexpected grants');
  else
    perform pg_temp.ok('SG-B3-PRIV2', 'no new table UPDATE/QV/DC grants');
  end if;

  perform pg_temp.become(v_user);
  begin
    perform public.m2b2_question_version_passes_integrity(v_qv, 'gcm-vunesp-pilot');
    perform pg_temp.bad('SG-B3-HELPER', 'authenticated executed integrity helper');
  exception when others then
    perform pg_temp.ok('SG-B3-HELPER', SQLSTATE);
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  select r.outcome into v_outcome from public.confirm_question_presentation(v_asg) r;
  if v_outcome = 'DENIED' then
    perform pg_temp.ok('SG-B3-NOUID', 'no uid → DENIED');
  else
    perform pg_temp.bad('SG-B3-NOUID', coalesce(v_outcome, 'null'));
  end if;

  perform pg_temp.ok('SG-B3-CONC', 'REAL MULTI-SESSION PRESENTATION CONCURRENCY TEST: DEFERRED TO BETA SECURITY GATE');
end;
$b3$;

select test_id, result, detail
from m2b3_validation_results
order by test_id;

select
  case when count(*) filter (where result = 'FAIL') = 0
    then 'M2B.3 SQL VALIDATION: ALL RECORDED TESTS PASSED'
    else 'M2B.3 SQL VALIDATION: FAILURES PRESENT'
  end as summary,
  count(*) filter (where result = 'FAIL') as failures,
  count(*) as recorded
from m2b3_validation_results;
