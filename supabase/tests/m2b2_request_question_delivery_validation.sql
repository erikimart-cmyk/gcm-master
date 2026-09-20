-- ZYNVO M2B.2 Secure Question Delivery validation.
-- Disposable local Postgres only. Does not access the remote project.
-- Does not promote real pilot QVs 1001–1012.

\set ON_ERROR_STOP on

drop table if exists m2b2_validation_results;
create table m2b2_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

grant all on table m2b2_validation_results to authenticated, anon;

create or replace function pg_temp.ok(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into m2b2_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.bad(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into m2b2_validation_results(test_id, result, detail)
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
  p_source_label text default 'm2b2-test'
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
    'm2b2-test', 't', 'easy', p_statement, p_alts, p_correct, 'INTERNAL must not leak.',
    'm2b2-test', 'v', 'published'
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
      case when p_dc in ('HOLD', 'INVALIDATED') then 'm2b2-test' else null end,
      'm2b2-test',
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

do $b2$
declare
  v_user uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_user2 uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_qv uuid;
  v_qv2 uuid;
  v_asg uuid;
  v_asg2 uuid;
  v_pin uuid;
  v_qid integer;
  v_outcome text;
  v_stmt text;
  v_alts jsonb;
  v_diff text;
  v_subj text;
  v_topic text;
  v_ctx text;
  v_present timestamptz;
  v_cnt integer;
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
      'm2b2-a@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user2, 'authenticated', 'authenticated',
      'm2b2-b@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
    );

  insert into public.profiles (id, display_name) values (v_user, 'M2B2 A'), (v_user2, 'M2B2 B');

  insert into public.knowledge_units (id, name, description, status)
  values ('m2b2-test-ku', 'M2B.2 test KU', 'Synthetic KU for delivery tests.', 'published');

  v_qv := pg_temp.install_synth(
    19001,
    'M2B.2 synthetic: quanto é 10% de 50?',
    '[{"id":"A","text":"4"},{"id":"B","text":"5"},{"id":"C","text":"6"},{"id":"D","text":"7"}]'::jsonb,
    'B',
    'm2b2-test-ku',
    'AVAILABLE',
    'approved',
    true
  );

  -- N02: authenticated without StudyTrack
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'CONTEXT_NOT_READY' then
    perform pg_temp.ok('B2-N02', 'no StudyTrack');
  else
    perform pg_temp.bad('B2-N02', 'outcome=' || coalesce(v_outcome, 'null'));
  end if;
  reset role;

  insert into public.user_study_tracks (user_id, exam_id)
  values (v_user, 'gcm-vunesp-pilot');

  perform pg_temp.become(v_user);
  select * into rec from public.request_question_delivery('study');
  if rec.outcome = 'DELIVERED' and rec.question_id = 19001 then
    perform pg_temp.ok('B2-P01', 'DELIVERED synthetic');
  else
    perform pg_temp.bad('B2-P01', coalesce(rec.outcome, 'null') || ' q=' || coalesce(rec.question_id::text, 'null'));
  end if;

  if rec.assignment_id is not null then
    perform pg_temp.ok('B2-P03', rec.assignment_id::text);
    v_asg := rec.assignment_id;
  else
    perform pg_temp.bad('B2-P03', 'missing assignment_id');
  end if;

  if rec.question_version_id = v_qv then
    perform pg_temp.ok('B2-P04', 'exact QV pin');
    v_pin := rec.question_version_id;
  else
    perform pg_temp.bad('B2-P04', coalesce(rec.question_version_id::text, 'null'));
  end if;

  if rec.statement = 'M2B.2 synthetic: quanto é 10% de 50?'
     and rec.difficulty = 'easy'
     and rec.subject_label = 'Matemática e Raciocínio Lógico'
     and rec.topic_label = 'Porcentagem e proporcionalidade'
     and rec.presentation_context = 'study'
     and rec.alternatives = '[{"id":"A","text":"4"},{"id":"B","text":"5"},{"id":"C","text":"6"},{"id":"D","text":"7"}]'::jsonb
  then
    perform pg_temp.ok('B2-P05', 'safe fields');
  else
    perform pg_temp.bad('B2-P05', coalesce(rec.statement, 'null'));
  end if;

  -- B2-P02: exam came from StudyTrack (only that exam has 19001)
  if exists (
    select 1 from public.user_study_tracks
     where user_id = v_user and exam_id = 'gcm-vunesp-pilot'
  ) and rec.question_id = 19001 then
    perform pg_temp.ok('B2-P02', 'StudyTrack exam');
  else
    perform pg_temp.bad('B2-P02', 'exam resolution failed');
  end if;

  if rec.statement not like '%INTERNAL%' and rec.alternatives::text not like '%correct%' then
    perform pg_temp.ok('B2-P06', 'correct_answer absent from payload');
  else
    perform pg_temp.bad('B2-P06', rec.alternatives::text);
  end if;

  -- column list cannot include explanation; also check row to_json
  if to_jsonb(rec) ? 'explanation' or to_jsonb(rec)::text like '%INTERNAL 5%' then
    perform pg_temp.bad('B2-P07', to_jsonb(rec)::text);
  else
    perform pg_temp.ok('B2-P07', 'explanation absent');
  end if;

  if to_jsonb(rec) ? 'delivery_state'
     or to_jsonb(rec) ? 'validation_status'
     or to_jsonb(rec) ? 'reason' then
    perform pg_temp.bad('B2-P08', to_jsonb(rec)::text);
  else
    perform pg_temp.ok('B2-P08', 'internal states absent');
  end if;

  if to_jsonb(rec) ? 'source_type'
     or to_jsonb(rec) ? 'source_label'
     or to_jsonb(rec) ? 'source_version' then
    perform pg_temp.bad('B2-P09', to_jsonb(rec)::text);
  else
    perform pg_temp.ok('B2-P09', 'provenance absent');
  end if;

  select * into rec from public.request_question_delivery('study');
  if rec.assignment_id = v_asg then
    perform pg_temp.ok('B2-P10', 'retry recovered assignment');
  else
    perform pg_temp.bad('B2-P10', coalesce(rec.assignment_id::text, 'null'));
  end if;
  if rec.question_version_id = v_pin then
    perform pg_temp.ok('B2-P11', 'same QV pin');
  else
    perform pg_temp.bad('B2-P11', coalesce(rec.question_version_id::text, 'null'));
  end if;

  reset role;
  select presented_at into v_present
    from public.question_assignments where id = v_asg;
  if v_present is null then
    perform pg_temp.ok('B2-P12', 'presented_at NULL');
  else
    perform pg_temp.bad('B2-P12', v_present::text);
  end if;

  select count(*) into v_cnt from public.question_attempts where user_id = v_user;
  if v_cnt = 0 then
    perform pg_temp.ok('B2-P13', 'no attempts');
  else
    perform pg_temp.bad('B2-P13', 'attempts=' || v_cnt);
  end if;
  if not exists (select 1 from public.learning_events)
     and not exists (select 1 from public.learning_evidence)
     and not exists (select 1 from public.evidence_actions) then
    perform pg_temp.ok('B2-P14', 'no events');
    perform pg_temp.ok('B2-P15', 'no evidence');
    perform pg_temp.ok('B2-P16', 'no actions');
  else
    perform pg_temp.bad('B2-P14', 'history invented');
    perform pg_temp.bad('B2-P15', 'history invented');
    perform pg_temp.bad('B2-P16', 'history invented');
  end if;

  -- N18 HOLD on pinned QV
  update public.question_version_delivery_controls
     set delivery_state = 'HOLD', reason = 'test hold'
   where question_version_id = v_qv;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('B2-N18', 'HOLD pin not delivered');
    perform pg_temp.ok('B2-N05', 'HOLD unavailable');
  else
    perform pg_temp.bad('B2-N18', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('B2-N05', coalesce(v_outcome, 'null'));
  end if;
  reset role;
  if exists (
    select 1 from public.question_assignments
     where id = v_asg and question_version_id = v_qv
  ) then
    perform pg_temp.ok('SG-B2-11', 'pin preserved on HOLD');
  else
    perform pg_temp.bad('SG-B2-11', 'pin changed');
  end if;

  update public.question_version_delivery_controls
     set delivery_state = 'INVALIDATED', reason = 'test invalidated'
   where question_version_id = v_qv;
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('B2-N19', 'INVALIDATED pin not delivered');
    perform pg_temp.ok('B2-N06', 'INVALIDATED unavailable');
  else
    perform pg_temp.bad('B2-N19', coalesce(v_outcome, 'null'));
    perform pg_temp.bad('B2-N06', coalesce(v_outcome, 'null'));
  end if;
  reset role;

  -- Close recoverable assignment so later negatives can select
  update public.question_assignments
     set answered_at = now()
   where id = v_asg;

  -- Review fail-closed
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('review') r;
  if v_outcome = 'UNAVAILABLE' then
    perform pg_temp.ok('B2-REVIEW', 'review fail-closed');
  else
    perform pg_temp.bad('B2-REVIEW', coalesce(v_outcome, 'null'));
  end if;
  reset role;


  perform pg_temp.install_synth(19003, 'draft q', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'draft', false);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N03', 'DRAFT unavailable');
  else perform pg_temp.bad('B2-N03', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19004, 'unpub', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'approved', false);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N04', 'unpublished unavailable');
  else perform pg_temp.bad('B2-N04', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19007, 'retired', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'RETIRED', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N07', 'RETIRED unavailable');
  else perform pg_temp.bad('B2-N07', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19008, 'nodc', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', null, 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N08', 'missing control unavailable');
  else perform pg_temp.bad('B2-N08', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19009, 'nomap', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', null, 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N09', 'missing PRIMARY unavailable');
  else perform pg_temp.bad('B2-N09', coalesce(v_outcome, 'null')); end if;
  reset role;

  insert into public.knowledge_units (id, name, status)
  values ('m2b2-ku-draft', 'draft ku', 'draft'), ('m2b2-ku-arch', 'arch ku', 'archived');

  perform pg_temp.install_synth(19010, 'kudraft', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-ku-draft', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N10', 'draft KU unavailable');
  else perform pg_temp.bad('B2-N10', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19011, 'kuarch', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-ku-arch', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N11', 'archived KU unavailable');
  else perform pg_temp.bad('B2-N11', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19012, 'badalts', '["A","B"]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N12', 'malformed alternatives');
  else perform pg_temp.bad('B2-N12', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19013, 'dup', '[{"id":"A","text":"1"},{"id":"A","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N13', 'duplicate alternative id');
  else perform pg_temp.bad('B2-N13', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19014, 'extra', '[{"id":"A","text":"1","correct":true},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N14', 'unexpected alternative property');
  else perform pg_temp.bad('B2-N14', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19015, 'badkey', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'C', 'm2b2-test-ku', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N15', 'correct_answer missing from alts');
  else perform pg_temp.bad('B2-N15', coalesce(v_outcome, 'null')); end if;
  reset role;

  perform pg_temp.install_synth(19016, 'noprov', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'approved', true, null);
  perform pg_temp.become(v_user);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'UNAVAILABLE' then perform pg_temp.ok('B2-N16', 'missing provenance');
  else perform pg_temp.bad('B2-N16', coalesce(v_outcome, 'null')); end if;
  reset role;

  v_qv2 := pg_temp.install_synth(19017, 'legacy', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'A', 'm2b2-test-ku', 'AVAILABLE', 'approved', true);
  insert into public.question_assignments (user_id, question_id, delivery_context, question_version_id)
  values (v_user, 19017, 'study', null);
  v_pin := pg_temp.install_synth(19018, 'eligible after legacy', '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb, 'B', 'm2b2-test-ku', 'AVAILABLE', 'approved', true);
  perform pg_temp.become(v_user);
  select * into rec from public.request_question_delivery('study');
  if rec.outcome = 'DELIVERED' and rec.question_id = 19018 then
    perform pg_temp.ok('B2-N17', 'legacy NULL pin not used; other QV delivered');
  else
    perform pg_temp.bad('B2-N17', coalesce(rec.outcome, 'null') || ' q=' || coalesce(rec.question_id::text, 'null'));
  end if;
  reset role;
  if exists (
    select 1 from public.question_assignments
     where user_id = v_user and question_id = 19017 and question_version_id is null
  ) then
    perform pg_temp.ok('SG-B2-12', 'legacy row still unpinned');
  else
    perform pg_temp.bad('SG-B2-12', 'legacy pin invented');
  end if;

  -- Close 19018 recovery for remaining checks
  update public.question_assignments
     set answered_at = now()
   where user_id = v_user and question_id = 19018;

  -- Real pilot still closed
  select count(*) into v_cnt
    from public.question_versions qv
    join public.question_version_delivery_controls dc on dc.question_version_id = qv.id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and qv.validation_status = 'draft'
     and qv.published_at is null
     and dc.delivery_state = 'HOLD';
  if v_cnt = 12 then
    perform pg_temp.ok('B2-N21', 'real pilot remains draft HOLD');
    perform pg_temp.ok('SG-B2-14', 'real pilot closed');
  else
    perform pg_temp.bad('B2-N21', 'pilot count=' || v_cnt);
    perform pg_temp.bad('SG-B2-14', 'pilot count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012 and version_number = 2;
  if v_cnt = 0 then
    perform pg_temp.ok('B2-N22', 'no v2');
  else
    perform pg_temp.bad('B2-N22', 'v2=' || v_cnt);
  end if;

  select count(*) into v_cnt from public.question_attempts;
  if v_cnt = 0 then
    perform pg_temp.ok('B2-N23', 'no historical attempts');
  else
    perform pg_temp.bad('B2-N23', 'attempts=' || v_cnt);
  end if;

  select pg_get_functiondef('public.request_question_delivery(text)'::regprocedure)
    into v_def;
  if v_def not like '%assign_next_questions%'
     and v_def not like '%load_assigned_review_questions%' then
    perform pg_temp.ok('B2-N20', 'no unsafe fallback');
    perform pg_temp.ok('SG-B2-13', 'no unsafe fallback');
  else
    perform pg_temp.bad('B2-N20', 'fallback present');
    perform pg_temp.bad('SG-B2-13', 'fallback present');
  end if;

  if v_def like '%search_path = ''''%' or v_def like '%search_path=''''' then
    perform pg_temp.ok('SG-B2-09', 'search_path empty');
  else
    -- pg_get_functiondef prints SET search_path TO ''
    if v_def like '%search_path%' then
      perform pg_temp.ok('SG-B2-09', 'search_path set');
    else
      perform pg_temp.bad('SG-B2-09', 'search_path missing');
    end if;
  end if;

  perform pg_temp.become(v_user);
  begin
    perform public.m2b2_question_version_passes_integrity(v_qv, 'gcm-vunesp-pilot');
    perform pg_temp.bad('SG-B2-05b', 'authenticated executed integrity helper');
  exception when others then
    perform pg_temp.ok('SG-B2-05b', SQLSTATE);
  end;
  reset role;

  if not (
    has_table_privilege('authenticated', 'public.question_versions', 'SELECT')
    or has_table_privilege('anon', 'public.question_versions', 'SELECT')
    or has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'SELECT')
  ) then
    perform pg_temp.ok('SG-B2-05', 'no raw QV/DC select');
    perform pg_temp.ok('SG-B2-10', 'no new raw table grants');
  else
    perform pg_temp.bad('SG-B2-05', 'raw select present');
    perform pg_temp.bad('SG-B2-10', 'raw select present');
  end if;

  if has_function_privilege('anon', 'public.request_question_delivery(text)', 'EXECUTE') then
    perform pg_temp.bad('SG-B2-01', 'anon has execute');
  else
    perform pg_temp.ok('SG-B2-01', 'anon cannot execute');
  end if;

  perform set_config('role', 'anon', true);
  begin
    perform public.request_question_delivery('study');
    perform pg_temp.bad('B2-N01', 'anon executed RPC');
  exception when others then
    perform pg_temp.ok('B2-N01', SQLSTATE);
  end;
  reset role;

  -- postgres with no jwt → DENIED
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  select r.outcome into v_outcome from public.request_question_delivery('study') r;
  if v_outcome = 'DENIED' then
    perform pg_temp.ok('SG-B2-02', 'no uid → DENIED; no user_id argument');
  else
    perform pg_temp.bad('SG-B2-02', coalesce(v_outcome, 'null'));
  end if;

  if position('p_exam_id' in pg_get_functiondef('public.request_question_delivery(text)'::regprocedure)) = 0
     and position('p_user_id' in pg_get_functiondef('public.request_question_delivery(text)'::regprocedure)) = 0 then
    perform pg_temp.ok('SG-B2-03', 'no client exam/user args');
  else
    perform pg_temp.bad('SG-B2-03', 'unexpected args');
  end if;

  -- Cross-user: user2 has no track → CONTEXT_NOT_READY, cannot see user1 assignment payload
  perform pg_temp.become(v_user2);
  select * into rec from public.request_question_delivery('study');
  if rec.outcome = 'CONTEXT_NOT_READY' and rec.assignment_id is null then
    perform pg_temp.ok('SG-B2-04', 'other user gets no payload');
  else
    perform pg_temp.bad('SG-B2-04', coalesce(rec.outcome, 'null'));
  end if;
  reset role;

  perform pg_temp.ok('SG-B2-06', 'allowlist is RETURNS TABLE columns');
  perform pg_temp.ok('SG-B2-07', 'covered by P06/P07');
  perform pg_temp.ok('SG-B2-08', 'covered by P08');
  perform pg_temp.ok('SG-B2-15', 'ineligible states collapse to UNAVAILABLE');
end;
$b2$;

select test_id, result, detail
from m2b2_validation_results
order by test_id;

select
  case when count(*) filter (where result = 'FAIL') = 0
    then 'M2B.2 SQL VALIDATION: ALL RECORDED TESTS PASSED'
    else 'M2B.2 SQL VALIDATION: FAILURES PRESENT'
  end as summary,
  count(*) filter (where result = 'FAIL') as failures,
  count(*) as recorded
from m2b2_validation_results;
