-- ZYNVO M2B: approved pilot KnowledgeUnits + PRIMARY mappings + draft QV edits.
-- Additive after M2B.1. Does not publish QuestionVersions or change DeliveryControl.
-- Does not rewrite public.questions. Does not create SUPPORTING mappings.
-- Does not cut over delivery RPCs, frontend, LearningEvent, or Evidence.

begin;

-- KnowledgeUnit.status allows draft | published | archived (M2A.1).
-- Taxonomy is approved; published is required so a future Pre-Delivery Integrity
-- Check can require published KUs without leaving this step in draft.
-- QuestionVersions remain draft + HOLD (finalization, not item publication).

insert into public.knowledge_units (id, name, description, status)
values
  (
    'percentage-of-quantity',
    'Porcentagem de uma quantidade',
    'Calcular uma porcentagem conhecida de uma quantidade.',
    'published'
  ),
  (
    'percentage-increase-decrease',
    'Aumento e desconto percentual',
    'Aplicar aumento ou desconto percentual a um valor.',
    'published'
  ),
  (
    'reverse-percentage',
    'Porcentagem reversa',
    'Determinar o total ou valor original a partir de uma parte ou valor percentual conhecido.',
    'published'
  ),
  (
    'percentage-change',
    'Variação percentual',
    'Determinar a variação percentual entre um valor inicial e um valor final.',
    'published'
  ),
  (
    'successive-percentage-changes',
    'Variações percentuais sucessivas',
    'Aplicar variações percentuais sucessivas sobre bases atualizadas.',
    'published'
  ),
  (
    'weighted-average',
    'Média ponderada',
    'Calcular média ponderada usando pesos percentuais.',
    'published'
  )
on conflict (id) do nothing;

do $ku$
declare
  v_cnt integer;
begin
  if exists (
    select 1
    from (
      values
        (
          'percentage-of-quantity',
          'Porcentagem de uma quantidade',
          'Calcular uma porcentagem conhecida de uma quantidade.',
          'published'
        ),
        (
          'percentage-increase-decrease',
          'Aumento e desconto percentual',
          'Aplicar aumento ou desconto percentual a um valor.',
          'published'
        ),
        (
          'reverse-percentage',
          'Porcentagem reversa',
          'Determinar o total ou valor original a partir de uma parte ou valor percentual conhecido.',
          'published'
        ),
        (
          'percentage-change',
          'Variação percentual',
          'Determinar a variação percentual entre um valor inicial e um valor final.',
          'published'
        ),
        (
          'successive-percentage-changes',
          'Variações percentuais sucessivas',
          'Aplicar variações percentuais sucessivas sobre bases atualizadas.',
          'published'
        ),
        (
          'weighted-average',
          'Média ponderada',
          'Calcular média ponderada usando pesos percentuais.',
          'published'
        )
    ) as expected(id, name, description, status)
    left join public.knowledge_units ku on ku.id = expected.id
    where ku.id is null
       or ku.name is distinct from expected.name
       or ku.description is distinct from expected.description
       or ku.status is distinct from expected.status
  ) then
    raise exception
      'Pilot KnowledgeUnit row diverges from the approved taxonomy';
  end if;

  select count(*) into v_cnt from public.knowledge_units
   where id in (
     'percentage-of-quantity',
     'percentage-increase-decrease',
     'reverse-percentage',
     'percentage-change',
     'successive-percentage-changes',
     'weighted-average'
   );
  if v_cnt <> 6 then
    raise exception 'Expected exactly 6 approved pilot KnowledgeUnits';
  end if;
end;
$ku$;

insert into public.question_version_knowledge_units (
  question_version_id,
  knowledge_unit_id,
  role
)
select qv.id, m.knowledge_unit_id, 'primary'
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
) as m(question_id, knowledge_unit_id)
join public.question_versions qv
  on qv.question_id = m.question_id
 and qv.version_number = 1
on conflict on constraint question_version_knowledge_units_pkey do nothing;

do $map$
declare
  v_cnt integer;
  v_missing integer;
begin
  select count(*) into v_cnt
    from public.question_versions
   where question_id between 1001 and 1012
     and version_number = 1;
  if v_cnt <> 12 then
    raise exception 'Pilot QV v1 count=%; expected 12 before mapping', v_cnt;
  end if;

  select count(*) into v_missing
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
  left join public.question_versions qv
    on qv.question_id = expected.question_id
   and qv.version_number = 1
  left join public.question_version_knowledge_units qvku
    on qvku.question_version_id = qv.id
   and qvku.knowledge_unit_id = expected.knowledge_unit_id
   and qvku.role = 'primary'
  where qvku.question_version_id is null;

  if v_missing <> 0 then
    raise exception 'Missing or non-primary approved pilot mappings: %', v_missing;
  end if;

  select count(*) into v_cnt
    from public.question_version_knowledge_units qvku
    join public.question_versions qv on qv.id = qvku.question_version_id
   where qv.question_id between 1001 and 1012;

  if v_cnt <> 12 then
    raise exception 'Pilot mapping count=%; expected exactly 12 PRIMARY', v_cnt;
  end if;

  if exists (
    select 1
    from public.question_version_knowledge_units
    where role <> 'primary'
  ) then
    raise exception 'SUPPORTING or unexpected mapping role present';
  end if;
end;
$map$;

do $edit$
declare
  v_qv_id uuid;
  v_status text;
  v_published timestamptz;
  v_state text;
  v_current_difficulty text;
  v_current_statement text;
  v_updated integer;
begin
  -- 1003 difficulty medium -> easy
  select qv.id, qv.validation_status, qv.published_at, qv.difficulty, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_difficulty, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1003
     and qv.version_number = 1;

  if v_qv_id is null then
    raise exception 'Pilot QV 1003 v1 not found';
  end if;
  if v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_current_difficulty is distinct from 'medium'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1003 v1 is not a mutable unpublished HOLD draft with difficulty=medium';
  end if;

  update public.question_versions
     set difficulty = 'easy'
   where id = v_qv_id
     and version_number = 1
     and validation_status = 'draft'
     and published_at is null
     and difficulty = 'medium';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1003 difficulty update matched % rows', v_updated;
  end if;

  -- 1008 difficulty medium -> easy
  select qv.id, qv.validation_status, qv.published_at, qv.difficulty, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_difficulty, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1008
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_current_difficulty is distinct from 'medium'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1008 v1 is not a mutable unpublished HOLD draft with difficulty=medium';
  end if;

  update public.question_versions
     set difficulty = 'easy'
   where id = v_qv_id
     and validation_status = 'draft'
     and published_at is null
     and difficulty = 'medium';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1008 difficulty update matched % rows', v_updated;
  end if;

  -- 1009 difficulty hard -> medium
  select qv.id, qv.validation_status, qv.published_at, qv.difficulty, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_difficulty, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1009
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_current_difficulty is distinct from 'hard'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1009 v1 is not a mutable unpublished HOLD draft with difficulty=hard';
  end if;

  update public.question_versions
     set difficulty = 'medium'
   where id = v_qv_id
     and validation_status = 'draft'
     and published_at is null
     and difficulty = 'hard';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1009 difficulty update matched % rows', v_updated;
  end if;

  -- 1010 difficulty hard -> medium
  select qv.id, qv.validation_status, qv.published_at, qv.difficulty, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_difficulty, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1010
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_current_difficulty is distinct from 'hard'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1010 v1 is not a mutable unpublished HOLD draft with difficulty=hard';
  end if;

  update public.question_versions
     set difficulty = 'medium'
   where id = v_qv_id
     and validation_status = 'draft'
     and published_at is null
     and difficulty = 'hard';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1010 difficulty update matched % rows', v_updated;
  end if;

  -- 1012 statement wording
  select qv.id, qv.validation_status, qv.published_at, qv.statement, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_statement, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1012
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_current_statement is distinct from
       'Em uma pesquisa com 120 pessoas, 60% escolheram a opção A. Quantas pessoas escolheram essa opção?'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1012 v1 is not a mutable unpublished HOLD draft with the expected current statement';
  end if;

  update public.question_versions
     set statement =
       'Em uma pesquisa com 120 pessoas, 60% escolheram determinada opção. Quantas pessoas escolheram essa opção?'
   where id = v_qv_id
     and validation_status = 'draft'
     and published_at is null
     and statement =
       'Em uma pesquisa com 120 pessoas, 60% escolheram a opção A. Quantas pessoas escolheram essa opção?';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1012 statement update matched % rows', v_updated;
  end if;

  -- Guard: untouched QV difficulties / statements still match M2B.1 import
  if exists (
    select 1 from public.question_versions
     where version_number = 1
       and (
         (question_id = 1001 and difficulty is distinct from 'easy')
         or (question_id = 1002 and difficulty is distinct from 'easy')
         or (question_id = 1004 and difficulty is distinct from 'medium')
         or (question_id = 1005 and difficulty is distinct from 'medium')
         or (question_id = 1006 and difficulty is distinct from 'medium')
         or (question_id = 1007 and difficulty is distinct from 'easy')
         or (question_id = 1011 and difficulty is distinct from 'hard')
         or (question_id = 1012 and difficulty is distinct from 'easy')
       )
  ) then
    raise exception 'Fail-closed: unexpected QV difficulty mutation outside the approved set';
  end if;

  if exists (
    select 1 from public.question_versions qv
     where qv.version_number = 1
       and qv.question_id between 1001 and 1011
       and qv.statement is distinct from (
         select q.statement from public.questions q where q.id = qv.question_id
       )
  ) then
    raise exception 'Fail-closed: unexpected QV statement mutation outside 1012';
  end if;
end;
$edit$;

commit;
