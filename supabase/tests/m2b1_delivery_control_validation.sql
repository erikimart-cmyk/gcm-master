-- ZYNVO M2B.1 local Delivery Control validation.
-- Disposable local Postgres only. Does not access the remote project.

\set ON_ERROR_STOP on

drop table if exists m2b1_validation_results;
create table m2b1_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

grant all on table m2b1_validation_results to authenticated, anon;

create or replace function pg_temp.ok(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into m2b1_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.bad(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into m2b1_validation_results(test_id, result, detail)
  values (p_id, 'FAIL', p_detail)
  on conflict (test_id) do update set result = 'FAIL', detail = excluded.detail;
end;
$$;

do $m2b1$
declare
  v_user uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_qv uuid;
  v_stmt text;
  v_status text;
  v_published timestamptz;
  v_cnt integer;
  v_cnt2 integer;
  v_attempts_before integer;
  v_events_before integer;
  v_evidence_before integer;
  v_actions_before integer;
  v_qv_before integer;
  rec record;
begin
  -- B14/B15 baseline after migration bootstrap
  select count(*) into v_attempts_before from public.question_attempts;
  select count(*) into v_events_before from public.learning_events;
  select count(*) into v_evidence_before from public.learning_evidence;
  select count(*) into v_actions_before from public.evidence_actions;
  select count(*) into v_qv_before from public.question_versions
   where question_id between 1001 and 1012;

  if v_attempts_before = 0 then
    perform pg_temp.ok('B14_pre', 'no historical attempts before extra bootstrap');
  else
    perform pg_temp.bad('B14_pre', 'unexpected attempts=' || v_attempts_before);
  end if;

  if v_events_before = 0 and v_evidence_before = 0 and v_actions_before = 0 then
    perform pg_temp.ok('B15_pre', 'no events/evidence/actions from bootstrap');
  else
    perform pg_temp.bad(
      'B15_pre',
      'events=' || v_events_before || ' evidence=' || v_evidence_before
      || ' actions=' || v_actions_before
    );
  end if;

  -- B16 TS 1–5 have no QuestionVersion
  select count(*) into v_cnt from public.question_versions where question_id between 1 and 5;
  if v_cnt = 0 then
    perform pg_temp.ok('B16', 'no QV for static catalog ids 1-5');
  else
    perform pg_temp.bad('B16', 'unexpected QV for 1-5 count=' || v_cnt);
  end if;

  -- Pilot drafts exist, none AVAILABLE/published
  select count(*) into v_cnt from public.question_versions
   where question_id between 1001 and 1012 and version_number = 1;
  if v_cnt = 12 then
    perform pg_temp.ok('PILOT_QV_COUNT', '12 draft v1 rows');
  else
    perform pg_temp.bad('PILOT_QV_COUNT', 'qv v1 count=' || v_cnt);
  end if;

  select count(*) into v_cnt from public.question_versions qv
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and qv.validation_status = 'approved'
     and qv.published_at is not null;
  if v_cnt = 12 then
    perform pg_temp.ok('PILOT_NOT_APPROVED', 'pilot v1 is approved and published');
  else
    perform pg_temp.bad('PILOT_NOT_APPROVED', 'approved/published count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and dc.delivery_state = 'HOLD';
  if v_cnt = 0 then
    perform pg_temp.ok('PILOT_HOLD', 'pilot v1 is no longer HOLD');
  else
    perform pg_temp.bad('PILOT_HOLD', 'HOLD count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and dc.delivery_state = 'AVAILABLE'
     and dc.reason is null
     and dc.provenance = 'm2b_pilot_canonical_promotion';
  if v_cnt = 12 then
    perform pg_temp.ok('PILOT_HOLD_REASON', 'pilot AVAILABLE provenance replaced the bootstrap HOLD reason');
  else
    perform pg_temp.bad('PILOT_HOLD_REASON', 'promoted control count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and dc.delivery_state = 'AVAILABLE';
  if v_cnt = 12 then
    perform pg_temp.ok('PILOT_NOT_AVAILABLE', '12 pilot v1 AVAILABLE');
  else
    perform pg_temp.bad('PILOT_NOT_AVAILABLE', 'AVAILABLE count=' || v_cnt);
  end if;

  -- M2B.1 created neither KnowledgeUnits nor mappings. That invariant is
  -- superseded by 20260920010000, which inserts the approved taxonomy:
  -- exactly 6 published KUs and 12 PRIMARY mappings, with no SUPPORTING row.
  select count(*) into v_cnt
    from public.knowledge_units
   where status = 'published'
     and id in (
       'percentage-of-quantity',
       'percentage-increase-decrease',
       'reverse-percentage',
       'percentage-change',
       'successive-percentage-changes',
       'weighted-average'
     );
  select count(*) into v_cnt2 from public.knowledge_units;
  if v_cnt = 6 and v_cnt2 = 6 then
    perform pg_temp.ok('PILOT_KU_TAXONOMY', 'exactly the 6 published pilot KnowledgeUnits');
  else
    perform pg_temp.bad('PILOT_KU_TAXONOMY', 'published=' || v_cnt || ' total=' || v_cnt2);
  end if;

  select count(*) into v_cnt
    from (
      values
        (1001, 'percentage-of-quantity'),
        (1007, 'percentage-of-quantity'),
        (1008, 'percentage-of-quantity'),
        (1012, 'percentage-of-quantity'),
        (1002, 'percentage-increase-decrease'),
        (1003, 'percentage-increase-decrease'),
        (1004, 'reverse-percentage'),
        (1010, 'reverse-percentage'),
        (1011, 'reverse-percentage'),
        (1005, 'percentage-change'),
        (1006, 'successive-percentage-changes'),
        (1009, 'weighted-average')
    ) as expected(question_id, knowledge_unit_id)
    join public.question_versions qv
      on qv.question_id = expected.question_id
     and qv.version_number = 1
    join public.question_version_knowledge_units qvku
      on qvku.question_version_id = qv.id
     and qvku.knowledge_unit_id = expected.knowledge_unit_id
     and qvku.role = 'primary';
  select count(*) into v_cnt2
    from public.question_version_knowledge_units
   where role is distinct from 'primary';
  if v_cnt = 12
     and v_cnt2 = 0
     and (select count(*) from public.question_version_knowledge_units) = 12
  then
    perform pg_temp.ok('PILOT_PRIMARY_MAPPINGS', '12 primary mappings and no supporting rows');
  else
    perform pg_temp.bad(
      'PILOT_PRIMARY_MAPPINGS',
      'matched=' || v_cnt || ' non_primary=' || v_cnt2
    );
  end if;

  -- B17/B18 final bootstrap state (function is not a residual API)
  select count(*) into v_cnt from public.question_versions
   where question_id between 1001 and 1012;
  select count(*) into v_cnt2 from public.question_versions
   where question_id between 1001 and 1012 and version_number = 2;
  if v_cnt = 12 and v_cnt = v_qv_before then
    perform pg_temp.ok('B17', 'clean install has exactly 12 pilot QV rows, all from migration');
  else
    perform pg_temp.bad('B17', 'qv count=' || v_cnt || ' before=' || v_qv_before);
  end if;
  if v_cnt2 = 0 then
    perform pg_temp.ok('B18', 'clean install created no QV v2');
  else
    perform pg_temp.bad('B18', 'v2 count=' || v_cnt2);
  end if;

  select count(*) into v_cnt from public.question_attempts;
  select count(*) into v_cnt2 from public.learning_events;
  if v_cnt = v_attempts_before then
    perform pg_temp.ok('B14', 'bootstrap did not touch attempts');
  else
    perform pg_temp.bad('B14', 'attempts after=' || v_cnt);
  end if;
  if v_cnt2 = v_events_before then
    perform pg_temp.ok('B15', 'bootstrap did not create events');
  else
    perform pg_temp.bad('B15', 'events after=' || v_cnt2);
  end if;

  -- Synthetic QV for constraint tests (question 1001 v99 draft)
  insert into public.question_versions (
    question_id, version_number, statement, alternatives, correct_answer,
    explanation, difficulty, source_type, validation_status
  ) values (
    1001, 99, 'Synthetic M2B.1 control fixture',
    '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb,
    'A', 'fixture', 'easy', 'zynvo_original', 'draft'
  )
  returning id into v_qv;

  insert into public.question_version_delivery_controls (
    question_version_id, delivery_state, reason, provenance, changed_by
  ) values (
    v_qv, 'AVAILABLE', null, 'm2b1-test', 'tester'
  );
  perform pg_temp.ok('B1_insert', 'one control per QV accepted');
  perform pg_temp.ok('B2_available', 'AVAILABLE allowed');

  begin
    insert into public.question_version_delivery_controls (
      question_version_id, delivery_state, provenance
    ) values (v_qv, 'AVAILABLE', 'm2b1-test');
    perform pg_temp.bad('B1', 'second control for same QV accepted');
  exception when unique_violation then
    perform pg_temp.ok('B1', SQLERRM);
  end;

  begin
    update public.question_version_delivery_controls
       set delivery_state = 'LIVE'
     where question_version_id = v_qv;
    perform pg_temp.bad('B3', 'invalid state accepted');
  exception when check_violation then
    perform pg_temp.ok('B3', SQLERRM);
  end;

  begin
    update public.question_version_delivery_controls
       set delivery_state = 'HOLD', reason = null
     where question_version_id = v_qv;
    perform pg_temp.bad('B4', 'HOLD without reason accepted');
  exception when check_violation then
    perform pg_temp.ok('B4', SQLERRM);
  end;

  update public.question_version_delivery_controls
     set delivery_state = 'HOLD',
         reason = 'editorial pause for fixture'
   where question_version_id = v_qv;
  perform pg_temp.ok('B4b', 'HOLD with reason accepted');

  begin
    update public.question_version_delivery_controls
       set delivery_state = 'INVALIDATED', reason = '   '
     where question_version_id = v_qv;
    perform pg_temp.bad('B5', 'INVALIDATED blank reason accepted');
  exception when check_violation then
    perform pg_temp.ok('B5', SQLERRM);
  end;

  update public.question_version_delivery_controls
     set delivery_state = 'INVALIDATED',
         reason = 'item withdrawn from delivery'
   where question_version_id = v_qv;
  perform pg_temp.ok('B5b', 'INVALIDATED with reason accepted');

  select statement into v_stmt from public.question_versions where id = v_qv;
  if v_stmt = 'Synthetic M2B.1 control fixture' then
    perform pg_temp.ok('B6', 'operational update did not change QV statement');
  else
    perform pg_temp.bad('B6', 'statement mutated to ' || v_stmt);
  end if;

  -- Publish synthetic QV then prove immutability; control may still change
  update public.question_versions
     set validation_status = 'approved', published_at = now()
   where id = v_qv;

  begin
    update public.question_versions
       set statement = 'mutated after publish'
     where id = v_qv;
    perform pg_temp.bad('B7', 'published QV mutation succeeded');
  exception when others then
    perform pg_temp.ok('B7', SQLERRM);
  end;

  update public.question_version_delivery_controls
     set delivery_state = 'RETIRED',
         reason = 'retired after publish without editing QV'
   where question_version_id = v_qv;
  select statement, validation_status, published_at
    into v_stmt, v_status, v_published
    from public.question_versions where id = v_qv;
  if v_stmt = 'Synthetic M2B.1 control fixture'
     and v_status = 'approved'
     and v_published is not null then
    perform pg_temp.ok('B7b', 'RETIRED did not rewrite published QV');
  else
    perform pg_temp.bad('B7b', 'published QV changed');
  end if;

  -- B19 FK
  begin
    insert into public.question_version_delivery_controls (
      question_version_id, delivery_state, provenance
    ) values (
      'ffffffff-ffff-ffff-ffff-ffffffffffff', 'AVAILABLE', 'm2b1-test'
    );
    perform pg_temp.bad('B19', 'orphan control accepted');
  exception when foreign_key_violation then
    perform pg_temp.ok('B19', SQLERRM);
  end;

  -- B20 delete control, QV remains; QV delete restricted while control exists
  insert into public.question_versions (
    question_id, version_number, statement, alternatives, correct_answer,
    explanation, difficulty, source_type, validation_status
  ) values (
    1002, 99, 'Delete-control fixture',
    '[{"id":"A","text":"1"},{"id":"B","text":"2"}]'::jsonb,
    'A', 'fixture', 'easy', 'zynvo_original', 'draft'
  ) returning id into v_qv;

  insert into public.question_version_delivery_controls (
    question_version_id, delivery_state, provenance
  ) values (v_qv, 'AVAILABLE', 'm2b1-test');

  begin
    delete from public.question_versions where id = v_qv;
    perform pg_temp.bad('B20_restrict', 'QV deleted while control existed');
  exception when foreign_key_violation then
    perform pg_temp.ok('B20_restrict', SQLERRM);
  end;

  delete from public.question_version_delivery_controls
   where question_version_id = v_qv;
  select count(*) into v_cnt from public.question_versions where id = v_qv;
  if v_cnt = 1 then
    perform pg_temp.ok('B20', 'deleting control left QV intact');
  else
    perform pg_temp.bad('B20', 'QV remaining=' || v_cnt);
  end if;

  -- RLS
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
    'm2b1-a@example.test', crypt('test', gen_salt('bf')), now(), now(), now(), '', '', '', ''
  );

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text,
    true
  );

  begin
    insert into public.question_version_delivery_controls (
      question_version_id, delivery_state, provenance
    )
    select id, 'AVAILABLE', 'client' from public.question_versions limit 1;
    perform pg_temp.bad('B8', 'authenticated INSERT succeeded');
  exception when others then
    perform pg_temp.ok('B8', SQLSTATE || ' ' || SQLERRM);
  end;

  begin
    update public.question_version_delivery_controls
       set delivery_state = 'RETIRED'
     where true;
    if found then
      perform pg_temp.bad('B9', 'authenticated UPDATE succeeded');
    else
      perform pg_temp.ok('B9', 'update matched no rows or blocked');
    end if;
  exception when others then
    perform pg_temp.ok('B9', SQLSTATE || ' ' || SQLERRM);
  end;

  begin
    delete from public.question_version_delivery_controls where true;
    if found then
      perform pg_temp.bad('B10', 'authenticated DELETE succeeded');
    else
      perform pg_temp.ok('B10', 'delete matched no rows or blocked');
    end if;
  exception when others then
    perform pg_temp.ok('B10', SQLSTATE || ' ' || SQLERRM);
  end;

  begin
    perform 1 from public.question_version_delivery_controls limit 1;
    perform pg_temp.bad('B12b', 'authenticated selected delivery_controls');
  exception when others then
    perform pg_temp.ok('B12b', SQLSTATE || ' ' || SQLERRM);
  end;

  begin
    perform correct_answer from public.question_versions limit 1;
    perform pg_temp.bad('B12', 'authenticated selected raw question_versions');
  exception when others then
    perform pg_temp.ok('B12', SQLSTATE || ' ' || SQLERRM);
  end;

  if to_regprocedure('public.bootstrap_m2b1_pilot_question_version_foundation()') is null then
    perform pg_temp.ok('B13_fn', 'bootstrap function absent from final schema');
  else
    perform pg_temp.bad('B13_fn', 'bootstrap function still present');
  end if;

  reset role;

  perform set_config('role', 'anon', true);
  begin
    insert into public.question_version_delivery_controls (
      question_version_id, delivery_state, provenance
    )
    select id, 'AVAILABLE', 'anon' from public.question_versions limit 1;
    perform pg_temp.bad('B11', 'anon INSERT succeeded');
  exception when others then
    perform pg_temp.ok('B11', SQLSTATE || ' ' || SQLERRM);
  end;
  begin
    perform 1 from public.question_versions limit 1;
    perform pg_temp.bad('B13', 'anon selected question_versions');
  exception when others then
    perform pg_temp.ok('B13', SQLSTATE || ' ' || SQLERRM);
  end;
  reset role;
end;
$m2b1$;

-- Per-question structural report for 1001–1012 (read-only inspect)
create temporary table m2b1_pilot_report as
select
  q.id as question_id,
  (q.statement is not null and char_length(trim(q.statement)) between 1 and 8000) as statement_ok,
  (jsonb_typeof(q.alternatives) = 'array' and jsonb_array_length(q.alternatives) >= 2) as alternatives_ok,
  (
    select bool_and(x.elem ->> 'id' in ('A', 'B', 'C', 'D'))
      and count(*) filter (where x.elem ->> 'id' = 'A') = 1
      and count(*) filter (where x.elem ->> 'id' = 'B') = 1
      and count(*) filter (where x.elem ->> 'id' = 'C') = 1
      and count(*) filter (where x.elem ->> 'id' = 'D') = 1
    from jsonb_array_elements(q.alternatives) as x(elem)
  ) as alternatives_a_d,
  q.correct_answer,
  exists (
    select 1
    from jsonb_array_elements(q.alternatives) elem
    where elem ->> 'id' = q.correct_answer
  ) as correct_matches_alternative,
  (q.explanation is not null and char_length(trim(q.explanation)) between 1 and 8000) as explanation_ok,
  q.difficulty,
  s.name as subject,
  t.name as topic,
  q.source_label,
  q.source_version,
  q.status,
  qv.validation_status as qv_validation_status,
  qv.published_at is not null as qv_published,
  dc.delivery_state
from public.questions q
join public.subjects s on s.id = q.subject_id
join public.topics t on t.id = q.topic_id
left join public.question_versions qv
  on qv.question_id = q.id and qv.version_number = 1
left join public.question_version_delivery_controls dc
  on dc.question_version_id = qv.id
where q.id between 1001 and 1012
order by q.id;

select * from m2b1_pilot_report;

select test_id, result, detail
from m2b1_validation_results
order by test_id;

select
  case when count(*) filter (where result = 'FAIL') = 0
    then 'M2B.1 SQL VALIDATION: ALL RECORDED TESTS PASSED'
    else 'M2B.1 SQL VALIDATION: FAILURES PRESENT'
  end as summary,
  count(*) filter (where result = 'FAIL') as failures,
  count(*) as recorded
from m2b1_validation_results;

-- Final-schema security / contract proof (postgres)
select
  to_regprocedure('public.bootstrap_m2b1_pilot_question_version_foundation()')
    as bootstrap_regprocedure,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'bootstrap_m2b1_pilot_question_version_foundation'
  ) as bootstrap_pg_proc_exists;

select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and p.proname like '%m2b1%';

select
  (select to_regclass('public.question_version_delivery_controls') is not null) as delivery_controls_exists,
  (select count(*) from public.question_versions where question_id between 1001 and 1012 and version_number = 1) as qv_v1,
  (select count(*) from public.question_versions where question_id between 1001 and 1012 and version_number = 2) as qv_v2,
  (select count(*) from public.question_versions where question_id between 1001 and 1012 and validation_status = 'draft' and published_at is null) as qv_draft_unpublished,
  (select count(*) from public.question_version_delivery_controls dc
     join public.question_versions qv on qv.id = dc.question_version_id
    where qv.question_id between 1001 and 1012 and dc.delivery_state = 'HOLD') as hold_rows,
  (select count(*) from public.knowledge_units) as knowledge_units,
  (select count(*) from public.question_version_knowledge_units) as ku_mappings,
  (select count(*) from public.question_attempts) as attempts,
  (select count(*) from public.learning_events) as learning_events,
  (select count(*) from public.learning_evidence) as learning_evidence,
  (select count(*) from public.question_versions where question_id between 1 and 5) as ts_qv,
  (
    select has_table_privilege('anon', 'public.question_version_delivery_controls', 'SELECT')
        or has_table_privilege('anon', 'public.question_version_delivery_controls', 'INSERT')
        or has_table_privilege('anon', 'public.question_version_delivery_controls', 'UPDATE')
        or has_table_privilege('anon', 'public.question_version_delivery_controls', 'DELETE')
  ) as anon_dc_priv,
  (
    select has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'SELECT')
        or has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'INSERT')
        or has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'UPDATE')
        or has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'DELETE')
  ) as authenticated_dc_priv,
  (
    select has_table_privilege('anon', 'public.question_versions', 'SELECT')
        or has_table_privilege('authenticated', 'public.question_versions', 'SELECT')
  ) as client_qv_select;
