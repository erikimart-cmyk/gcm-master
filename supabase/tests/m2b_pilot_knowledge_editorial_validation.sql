-- ZYNVO M2B pilot KnowledgeUnit mapping + editorial finalization.
-- Disposable local Postgres only. Does not access the remote project.

\set ON_ERROR_STOP on

drop table if exists m2b_ku_validation_results;
create table m2b_ku_validation_results (
  test_id text primary key,
  result text not null,
  detail text
);

grant all on table m2b_ku_validation_results to authenticated, anon;

create or replace function pg_temp.ok(p_id text, p_detail text default 'ok')
returns void language plpgsql as $$
begin
  insert into m2b_ku_validation_results(test_id, result, detail)
  values (p_id, 'PASS', p_detail)
  on conflict (test_id) do update set result = 'PASS', detail = excluded.detail;
end;
$$;

create or replace function pg_temp.bad(p_id text, p_detail text)
returns void language plpgsql as $$
begin
  insert into m2b_ku_validation_results(test_id, result, detail)
  values (p_id, 'FAIL', p_detail)
  on conflict (test_id) do update set result = 'FAIL', detail = excluded.detail;
end;
$$;

do $k$
declare
  v_cnt integer;
  v_cnt2 integer;
  v_stmt text;
  v_qid integer;
  rec record;
begin
  select count(*) into v_cnt from public.knowledge_units;
  if v_cnt = 6 then
    perform pg_temp.ok('K1', 'exactly 6 KnowledgeUnits');
  else
    perform pg_temp.bad('K1', 'count=' || v_cnt);
  end if;

  if (
    select count(*) from public.knowledge_units
     where id in (
       'percentage-of-quantity',
       'percentage-increase-decrease',
       'reverse-percentage',
       'percentage-change',
       'successive-percentage-changes',
       'weighted-average'
     )
  ) = 6
     and not exists (
       select 1 from public.knowledge_units
        where id not in (
          'percentage-of-quantity',
          'percentage-increase-decrease',
          'reverse-percentage',
          'percentage-change',
          'successive-percentage-changes',
          'weighted-average'
        )
     )
  then
    perform pg_temp.ok('K2', 'IDs match approved taxonomy');
  else
    perform pg_temp.bad('K2', 'unexpected KnowledgeUnit ids');
  end if;

  select count(*) into v_cnt
    from public.question_version_knowledge_units qvku
    join public.question_versions qv on qv.id = qvku.question_version_id
   where qv.question_id between 1001 and 1012;
  if v_cnt = 12 then
    perform pg_temp.ok('K3', 'exactly 12 pilot mappings');
  else
    perform pg_temp.bad('K3', 'mapping count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_knowledge_units
   where role = 'primary';
  if v_cnt = 12 then
    perform pg_temp.ok('K4', 'all mappings PRIMARY');
  else
    perform pg_temp.bad('K4', 'primary count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_knowledge_units
   where role = 'supporting';
  if v_cnt = 0 then
    perform pg_temp.ok('K5', 'zero SUPPORTING');
  else
    perform pg_temp.bad('K5', 'supporting count=' || v_cnt);
  end if;

  v_cnt := 0;
  for rec in
    select * from (values
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
  loop
    select count(*) into v_cnt2
      from public.question_version_knowledge_units qvku
      join public.question_versions qv on qv.id = qvku.question_version_id
     where qv.question_id = rec.question_id
       and qv.version_number = 1
       and qvku.knowledge_unit_id = rec.knowledge_unit_id
       and qvku.role = 'primary';
    if v_cnt2 = 1 then
      v_cnt := v_cnt + 1;
    end if;
  end loop;
  if v_cnt = 12 then
    perform pg_temp.ok('K6', 'each pilot QV has exactly the approved PRIMARY mapping');
  else
    perform pg_temp.bad('K6', 'matched pairs=' || v_cnt);
  end if;

  select difficulty into v_stmt
    from public.question_versions
   where question_id = 1003 and version_number = 1;
  if v_stmt = 'easy' then
    perform pg_temp.ok('K7', '1003 difficulty=easy');
  else
    perform pg_temp.bad('K7', '1003 difficulty=' || coalesce(v_stmt, 'null'));
  end if;

  select difficulty into v_stmt
    from public.question_versions
   where question_id = 1008 and version_number = 1;
  if v_stmt = 'easy' then
    perform pg_temp.ok('K8', '1008 difficulty=easy');
  else
    perform pg_temp.bad('K8', '1008 difficulty=' || coalesce(v_stmt, 'null'));
  end if;

  select difficulty into v_stmt
    from public.question_versions
   where question_id = 1009 and version_number = 1;
  if v_stmt = 'medium' then
    perform pg_temp.ok('K9', '1009 difficulty=medium');
  else
    perform pg_temp.bad('K9', '1009 difficulty=' || coalesce(v_stmt, 'null'));
  end if;

  select difficulty into v_stmt
    from public.question_versions
   where question_id = 1010 and version_number = 1;
  if v_stmt = 'medium' then
    perform pg_temp.ok('K10', '1010 difficulty=medium');
  else
    perform pg_temp.bad('K10', '1010 difficulty=' || coalesce(v_stmt, 'null'));
  end if;

  select statement into v_stmt
    from public.question_versions
   where question_id = 1012 and version_number = 1;
  if v_stmt =
     'Em uma pesquisa com 120 pessoas, 60% escolheram determinada opção. Quantas pessoas escolheram essa opção?'
  then
    perform pg_temp.ok('K11', '1012 statement is the approved wording');
  else
    perform pg_temp.bad('K11', '1012 statement=' || coalesce(v_stmt, 'null'));
  end if;

  select count(*) into v_cnt
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
   where qv.version_number = 1
     and qv.question_id between 1001 and 1011
     and qv.statement is distinct from q.statement;
  if v_cnt = 0 then
    perform pg_temp.ok('K12', 'no other QV statement changed');
  else
    perform pg_temp.bad('K12', 'changed statements=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where version_number = 1
     and question_id between 1001 and 1012
     and (
       (question_id in (1001, 1002, 1007, 1012) and difficulty <> 'easy')
       or (question_id in (1003, 1008) and difficulty <> 'easy')
       or (question_id in (1004, 1005, 1006, 1009, 1010) and difficulty <> 'medium')
       or (question_id = 1011 and difficulty <> 'hard')
     );
  if v_cnt = 0 then
    perform pg_temp.ok('K13', 'only approved difficulties changed');
  else
    perform pg_temp.bad('K13', 'unexpected difficulty rows=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
   where qv.version_number = 1
     and qv.question_id between 1001 and 1012
     and qv.alternatives is distinct from q.alternatives;
  if v_cnt = 0 then
    perform pg_temp.ok('K14', 'alternatives intact vs catalog snapshot');
  else
    perform pg_temp.bad('K14', 'alts changed=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
   where qv.version_number = 1
     and qv.question_id between 1001 and 1012
     and qv.correct_answer is distinct from q.correct_answer;
  if v_cnt = 0 then
    perform pg_temp.ok('K15', 'correct_answer intact');
  else
    perform pg_temp.bad('K15', 'answers changed=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
   where qv.version_number = 1
     and qv.question_id between 1001 and 1012
     and qv.explanation is distinct from q.explanation;
  if v_cnt = 0 then
    perform pg_temp.ok('K16', 'explanation intact');
  else
    perform pg_temp.bad('K16', 'explanations changed=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where version_number = 1
     and question_id between 1001 and 1012
     and (
       source_type is distinct from 'zynvo_original'
       or source_label is distinct from 'ZYNVO Original · Referência: Edital Limeira 02/2026'
       or source_version is distinct from '2026.09.04-limeira-gcm'
     );
  if v_cnt = 0 then
    perform pg_temp.ok('K17', 'source/provenance intact');
  else
    perform pg_temp.bad('K17', 'source mutated rows=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012
     and version_number = 1
     and validation_status = 'draft';
  if v_cnt = 12 then
    perform pg_temp.ok('K18', 'all 12 remain draft');
  else
    perform pg_temp.bad('K18', 'draft count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012
     and version_number = 1
     and published_at is null;
  if v_cnt = 12 then
    perform pg_temp.ok('K19', 'all published_at NULL');
  else
    perform pg_temp.bad('K19', 'null published_at count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and dc.delivery_state = 'HOLD';
  if v_cnt = 12 then
    perform pg_temp.ok('K20', 'all 12 DeliveryControl HOLD');
  else
    perform pg_temp.bad('K20', 'HOLD count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_version_delivery_controls
   where delivery_state = 'AVAILABLE';
  if v_cnt = 0 then
    perform pg_temp.ok('K21', 'zero AVAILABLE');
  else
    perform pg_temp.bad('K21', 'AVAILABLE count=' || v_cnt);
  end if;

  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012
     and version_number = 2;
  if v_cnt = 0 then
    perform pg_temp.ok('K22', 'zero QV v2');
  else
    perform pg_temp.bad('K22', 'v2 count=' || v_cnt);
  end if;

  select count(*) into v_cnt from public.questions q
   where q.id between 1001 and 1012
     and (
       (q.id = 1003 and q.difficulty <> 'medium')
       or (q.id = 1008 and q.difficulty <> 'medium')
       or (q.id = 1009 and q.difficulty <> 'hard')
       or (q.id = 1010 and q.difficulty <> 'hard')
       or (
         q.id = 1012
         and q.statement <>
           'Em uma pesquisa com 120 pessoas, 60% escolheram a opção A. Quantas pessoas escolheram essa opção?'
       )
     );
  if v_cnt = 0 then
    perform pg_temp.ok('K23', 'public.questions keeps historical wording/difficulty');
  else
    perform pg_temp.bad('K23', 'catalog mutations=' || v_cnt);
  end if;

  select count(*) into v_cnt from public.question_attempts;
  if v_cnt = 0 then
    perform pg_temp.ok('K24', 'no historical attempts invented or altered');
  else
    perform pg_temp.bad('K24', 'attempts=' || v_cnt);
  end if;

  select count(*) into v_cnt from public.learning_events;
  select count(*) into v_cnt2 from public.learning_evidence;
  if v_cnt = 0 and v_cnt2 = 0
     and not exists (select 1 from public.evidence_actions)
  then
    perform pg_temp.ok('K25', 'zero Event/Evidence/Action invented');
  else
    perform pg_temp.bad('K25', 'events=' || v_cnt || ' evidence=' || v_cnt2);
  end if;

  select count(*) into v_cnt from public.question_versions where question_id between 1 and 5;
  select count(*) into v_cnt2
    from public.question_version_knowledge_units qvku
    join public.question_versions qv on qv.id = qvku.question_version_id
   where qv.question_id between 1 and 5;
  if v_cnt = 0 and v_cnt2 = 0 then
    perform pg_temp.ok('K26', 'TS ids 1-5 have no QV or mapping');
  else
    perform pg_temp.bad('K26', 'qv=' || v_cnt || ' map=' || v_cnt2);
  end if;

  if to_regprocedure('public.bootstrap_m2b1_pilot_question_version_foundation()') is null
     and not exists (
       select 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prosecdef
         and p.proname like '%m2b%'
     )
  then
    perform pg_temp.ok('K27', 'no residual privileged M2B API');
  else
    perform pg_temp.bad('K27', 'privileged function still present');
  end if;

  if not (
       has_table_privilege('anon', 'public.question_version_delivery_controls', 'SELECT')
    or has_table_privilege('anon', 'public.question_versions', 'SELECT')
    or has_table_privilege('authenticated', 'public.question_version_delivery_controls', 'SELECT')
    or has_table_privilege('authenticated', 'public.question_versions', 'SELECT')
    or has_table_privilege('authenticated', 'public.question_version_knowledge_units', 'SELECT')
    or has_table_privilege('anon', 'public.knowledge_units', 'SELECT')
    or has_table_privilege('authenticated', 'public.knowledge_units', 'INSERT')
    or has_table_privilege('authenticated', 'public.question_version_knowledge_units', 'INSERT')
  ) and has_table_privilege('authenticated', 'public.knowledge_units', 'SELECT')
  then
    perform pg_temp.ok('K28', 'grants/RLS not widened beyond M2A KU SELECT');
  else
    perform pg_temp.bad('K28', 'unexpected privilege expansion');
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'knowledge_units'
      and column_name in (
        'target_id', 'journey_id', 'topic_id', 'exam_id', 'subject_id'
      )
  ) then
    perform pg_temp.ok('K30', 'KnowledgeUnit has no Target/Journey/Topic ownership columns');
  else
    perform pg_temp.bad('K30', 'ownership column present on knowledge_units');
  end if;
end;
$k$;

select test_id, result, detail
from m2b_ku_validation_results
order by test_id;

select
  case when count(*) filter (where result = 'FAIL') = 0
    then 'M2B PILOT KU/EDITORIAL SQL VALIDATION: ALL RECORDED TESTS PASSED'
    else 'M2B PILOT KU/EDITORIAL SQL VALIDATION: FAILURES PRESENT'
  end as summary,
  count(*) filter (where result = 'FAIL') as failures,
  count(*) as recorded
from m2b_ku_validation_results;
