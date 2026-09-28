-- ZYNVO M2B: atomic promotion of pilot QuestionVersion v1 (1001–1012).
-- Does not touch question_assignments, question_attempts, learning_events, or learning_evidence.
-- Does not rewrite public.questions. Does not alter RPCs. Does not backfill version pins.
-- Fail-closed: any guard mismatch aborts the transaction and promotes nothing.

begin;

do $promote$
declare
  v_published timestamptz := now();
  v_updated integer;
  v_questions_before text;
  v_questions_after text;
  v_other_qv_before text;
  v_other_qv_after text;
  v_other_dc_before text;
  v_other_dc_after text;
  v_map_before text;
  v_map_after text;
  v_asg_before text;
  v_asg_after text;
  v_att_before text;
  v_att_after text;
  v_events_before text;
  v_events_after text;
  v_evidence_before text;
  v_evidence_after text;
  v_actions_before text;
  v_actions_after text;
  v_hold_reason constant text :=
    'Pilot QuestionVersion v1 is a structural import awaiting editorial approval. Not available for delivery.';
  v_source_label constant text :=
    'ZYNVO Original · Referência: Edital Limeira 02/2026';
  v_source_version constant text := '2026.09.04-limeira-gcm';
  v_provenance constant text := 'm2b_pilot_canonical_promotion';
begin
  select md5(string_agg(q::text, ',' order by q.id))
    into v_questions_before
    from public.questions q;

  select md5(string_agg(qv::text, ',' order by qv.id))
    into v_other_qv_before
    from public.question_versions qv
   where qv.question_id < 1001
      or qv.question_id > 1012
      or qv.version_number <> 1;

  select md5(string_agg(dc::text, ',' order by dc.question_version_id))
    into v_other_dc_before
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id < 1001
      or qv.question_id > 1012
      or qv.version_number <> 1;

  select md5(string_agg(qvku::text, ',' order by qvku.question_version_id, qvku.knowledge_unit_id))
    into v_map_before
    from public.question_version_knowledge_units qvku;

  select md5(string_agg(qa::text, ',' order by qa.user_id, qa.question_id))
    into v_asg_before
    from public.question_assignments qa;

  select md5(string_agg(qa::text, ',' order by qa.id))
    into v_att_before
    from public.question_attempts qa;

  select md5(string_agg(le::text, ',' order by le.id))
    into v_events_before
    from public.learning_events le;

  select md5(string_agg(ev::text, ',' order by ev.id))
    into v_evidence_before
    from public.learning_evidence ev;

  select md5(string_agg(ea::text, ',' order by ea.id))
    into v_actions_before
    from public.evidence_actions ea;

  if (
    select count(*)
      from public.question_versions
     where question_id between 1001 and 1012
  ) <> 12
  or (
    select count(*)
      from public.question_versions
     where question_id between 1001 and 1012
       and version_number = 1
  ) <> 12
  or (
    select count(distinct question_id)
      from public.question_versions
     where question_id between 1001 and 1012
       and version_number = 1
  ) <> 12
  or exists (
    select 1
      from public.question_versions
     where question_id between 1001 and 1012
       and version_number <> 1
  )
  or exists (
    select 1
      from generate_series(1001, 1012) as expected(question_id)
      left join public.question_versions qv
        on qv.question_id = expected.question_id
       and qv.version_number = 1
     where qv.id is null
  )
  or (
    select count(*)
      from public.question_versions qv
      join public.question_version_delivery_controls dc
        on dc.question_version_id = qv.id
     where qv.question_id between 1001 and 1012
       and qv.version_number = 1
  ) <> 12
  then
    raise exception
      'Fail-closed: pilot target is not exactly one v1 for each question 1001–1012';
  end if;

  if exists (
    select 1
      from public.question_version_delivery_controls
     where delivery_state = 'AVAILABLE'
  ) then
    raise exception 'Fail-closed: unexpected AVAILABLE delivery control before promotion';
  end if;

  if exists (
    select 1
      from public.question_assignments qa
      join public.question_versions qv on qv.id = qa.question_version_id
     where qv.question_id between 1001 and 1012
  )
  or exists (
    select 1
      from public.question_attempts qa
      join public.question_versions qv on qv.id = qa.question_version_id
     where qv.question_id between 1001 and 1012
  )
  then
    raise exception
      'Fail-closed: a pilot QuestionVersion is already pinned by an assignment or attempt';
  end if;

  if exists (
    select 1
      from (
        values
          (1001, 'easy', 'C', 'percentage-of-quantity',
            'Quanto é 10% de 350?',
            '10% corresponde a 10/100. Portanto, 350 × 0,10 = 35.',
            '[{"id":"A","text":"25"},{"id":"B","text":"30"},{"id":"C","text":"35"},{"id":"D","text":"40"}]'::jsonb),
          (1002, 'easy', 'B', 'percentage-increase-decrease',
            'Um produto custa R$ 80 e recebe desconto de 15%. Qual é o preço final?',
            '15% de 80 é 12. Assim, 80 - 12 = R$ 68.',
            '[{"id":"A","text":"R$ 65"},{"id":"B","text":"R$ 68"},{"id":"C","text":"R$ 70"},{"id":"D","text":"R$ 72"}]'::jsonb),
          (1003, 'easy', 'D', 'percentage-increase-decrease',
            'Um valor de R$ 250 sofreu aumento de 8%. Qual é o novo valor?',
            '8% de 250 é 20. O novo valor é 250 + 20 = 270.',
            '[{"id":"A","text":"R$ 258"},{"id":"B","text":"R$ 260"},{"id":"C","text":"R$ 268"},{"id":"D","text":"R$ 270"}]'::jsonb),
          (1004, 'medium', 'B', 'reverse-percentage',
            'Se 30% de uma quantidade correspondem a 45, qual é a quantidade total?',
            'Se 30% é 45, então 100% é 45 ÷ 0,30 = 150.',
            '[{"id":"A","text":"135"},{"id":"B","text":"150"},{"id":"C","text":"165"},{"id":"D","text":"180"}]'::jsonb),
          (1005, 'medium', 'C', 'percentage-change',
            'Um valor passou de 40 para 50. Qual foi o aumento percentual?',
            'O aumento foi 10 sobre o valor inicial 40: 10 ÷ 40 = 0,25 = 25%.',
            '[{"id":"A","text":"20%"},{"id":"B","text":"22,5%"},{"id":"C","text":"25%"},{"id":"D","text":"30%"}]'::jsonb),
          (1006, 'medium', 'B', 'successive-percentage-changes',
            'Um item de R$ 100 recebe dois descontos sucessivos: primeiro 10% e depois 20%. Qual é o preço final?',
            'Após 10%, o valor é 90. Aplicando 20% de desconto sobre 90, chega-se a 72.',
            '[{"id":"A","text":"R$ 70"},{"id":"B","text":"R$ 72"},{"id":"C","text":"R$ 75"},{"id":"D","text":"R$ 80"}]'::jsonb),
          (1007, 'easy', 'B', 'percentage-of-quantity',
            'Em uma turma com 40 alunos, 25% faltaram. Quantos alunos faltaram?',
            '25% equivale a um quarto. Um quarto de 40 é 10.',
            '[{"id":"A","text":"8"},{"id":"B","text":"10"},{"id":"C","text":"12"},{"id":"D","text":"15"}]'::jsonb),
          (1008, 'easy', 'C', 'percentage-of-quantity',
            'Uma prova tem 50 questões e uma candidata acertou 70%. Quantas questões ela acertou?',
            '70% de 50 é 0,70 × 50 = 35.',
            '[{"id":"A","text":"30"},{"id":"B","text":"32"},{"id":"C","text":"35"},{"id":"D","text":"40"}]'::jsonb),
          (1009, 'medium', 'B', 'weighted-average',
            'Uma média é formada por 70% de uma nota 50 e 30% de uma nota 80. Qual é a média ponderada?',
            '0,70 × 50 = 35 e 0,30 × 80 = 24. A soma é 59.',
            '[{"id":"A","text":"56"},{"id":"B","text":"59"},{"id":"C","text":"62"},{"id":"D","text":"65"}]'::jsonb),
          (1010, 'medium', 'C', 'reverse-percentage',
            'Se 20% de um número é 36, qual é esse número?',
            '20% é 0,20. Logo, 36 ÷ 0,20 = 180.',
            '[{"id":"A","text":"144"},{"id":"B","text":"160"},{"id":"C","text":"180"},{"id":"D","text":"200"}]'::jsonb),
          (1011, 'hard', 'C', 'reverse-percentage',
            'Após um desconto de 25%, um produto passou a custar R$ 150. Qual era o preço original?',
            'Após desconto de 25%, restam 75% do preço. Então 150 ÷ 0,75 = 200.',
            '[{"id":"A","text":"R$ 180"},{"id":"B","text":"R$ 190"},{"id":"C","text":"R$ 200"},{"id":"D","text":"R$ 225"}]'::jsonb),
          (1012, 'easy', 'C', 'percentage-of-quantity',
            'Em uma pesquisa com 120 pessoas, 60% escolheram determinada opção. Quantas pessoas escolheram essa opção?',
            '60% de 120 é 0,60 × 120 = 72.',
            '[{"id":"A","text":"60"},{"id":"B","text":"66"},{"id":"C","text":"72"},{"id":"D","text":"80"}]'::jsonb)
      ) as expected(
        question_id, difficulty, correct_answer, knowledge_unit_id,
        statement, explanation, alternatives
      )
      join public.question_versions qv
        on qv.question_id = expected.question_id
       and qv.version_number = 1
      join public.questions q on q.id = qv.question_id
      join public.exams e on e.id = q.exam_id
      join public.question_version_delivery_controls dc
        on dc.question_version_id = qv.id
      left join public.question_version_knowledge_units qvku
        on qvku.question_version_id = qv.id
       and qvku.role = 'primary'
       and qvku.knowledge_unit_id = expected.knowledge_unit_id
      left join public.knowledge_units ku
        on ku.id = qvku.knowledge_unit_id
     where qv.validation_status is distinct from 'draft'
        or qv.published_at is not null
        or qv.difficulty is distinct from expected.difficulty
        or qv.correct_answer is distinct from expected.correct_answer
        or qv.statement is distinct from expected.statement
        or qv.explanation is distinct from expected.explanation
        or qv.alternatives is distinct from expected.alternatives
        or qv.source_type is distinct from 'zynvo_original'
        or qv.source_label is distinct from v_source_label
        or qv.source_version is distinct from v_source_version
        or char_length(trim(qv.statement)) not between 1 and 8000
        or char_length(trim(qv.explanation)) not between 1 and 8000
        or char_length(trim(qv.correct_answer)) not between 1 and 8
        or char_length(trim(qv.source_label)) not between 1 and 160
        or char_length(trim(qv.source_version)) not between 1 and 64
        or q.exam_id is distinct from 'gcm-vunesp-pilot'
        or q.status is distinct from 'published'
        or e.status is distinct from 'published'
        or dc.delivery_state is distinct from 'HOLD'
        or dc.reason is distinct from v_hold_reason
        or dc.provenance is distinct from 'm2b1_pilot_bootstrap'
        or qvku.question_version_id is null
        or ku.status is distinct from 'published'
        or (
          select count(*)
            from public.question_version_knowledge_units mapped
           where mapped.question_version_id = qv.id
        ) <> 1
  ) then
    raise exception
      'Fail-closed: pilot v1 content, mapping, or pre-publication state diverges';
  end if;

  if exists (
    select 1
      from public.question_versions qv
      cross join lateral jsonb_array_elements(qv.alternatives) as elem
     where qv.question_id between 1001 and 1012
       and qv.version_number = 1
       and (
         jsonb_typeof(qv.alternatives) is distinct from 'array'
         or jsonb_array_length(qv.alternatives) < 2
         or jsonb_typeof(elem) is distinct from 'object'
         or (
           select array_agg(k order by k)
             from jsonb_object_keys(elem) as k
         ) is distinct from array['id', 'text']::text[]
         or jsonb_typeof(elem -> 'id') is distinct from 'string'
         or jsonb_typeof(elem -> 'text') is distinct from 'string'
         or char_length(trim(elem ->> 'id')) not between 1 and 8
         or char_length(trim(elem ->> 'text')) not between 1 and 2000
       )
  )
  or exists (
    select 1
      from public.question_versions qv
      cross join lateral (
        select trim(elem ->> 'id') as alt_id
          from jsonb_array_elements(qv.alternatives) as elem
         group by 1
        having count(*) > 1
      ) as duplicated
     where qv.question_id between 1001 and 1012
       and qv.version_number = 1
  )
  or exists (
    select 1
      from public.question_versions qv
     where qv.question_id between 1001 and 1012
       and qv.version_number = 1
       and not exists (
         select 1
           from jsonb_array_elements(qv.alternatives) as elem
          where trim(elem ->> 'id') = qv.correct_answer
       )
  )
  then
    raise exception
      'Fail-closed: pilot alternatives fail the delivery integrity contract';
  end if;

  if (
    select q.explanation
      from public.questions q
     where q.id = 1002
  ) is distinct from '15% de 80 é 12. Assim, 80 - 12 = 68.'
  or (
    select q.statement
      from public.questions q
     where q.id = 1003
  ) is distinct from 'Uma taxa de R$ 250 sofreu aumento de 8%. Qual é o novo valor?'
  or (
    select q.difficulty
      from public.questions q
     where q.id = 1003
  ) is distinct from 'medium'
  or (
    select q.statement
      from public.questions q
     where q.id = 1012
  ) is distinct from 'Em uma pesquisa com 120 pessoas, 60% escolheram a opção A. Quantas pessoas escolheram essa opção?'
  then
    raise exception
      'Fail-closed: public.questions historical snapshot is not the expected legacy copy';
  end if;

  update public.question_versions qv
     set validation_status = 'approved',
         published_at = v_published
   where qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and qv.validation_status = 'draft'
     and qv.published_at is null;
  get diagnostics v_updated = row_count;
  if v_updated <> 12 then
    raise exception
      'Fail-closed: approval update matched % rows', v_updated;
  end if;

  update public.question_version_delivery_controls dc
     set delivery_state = 'AVAILABLE',
         reason = null,
         provenance = v_provenance,
         changed_by = 'system'
    from public.question_versions qv
   where dc.question_version_id = qv.id
     and qv.question_id between 1001 and 1012
     and qv.version_number = 1
     and qv.validation_status = 'approved'
     and qv.published_at = v_published
     and dc.delivery_state = 'HOLD';
  get diagnostics v_updated = row_count;
  if v_updated <> 12 then
    raise exception
      'Fail-closed: delivery update matched % rows', v_updated;
  end if;

  if (
    select count(*)
      from public.question_versions qv
      join public.question_version_delivery_controls dc
        on dc.question_version_id = qv.id
     where qv.question_id between 1001 and 1012
       and qv.version_number = 1
       and qv.validation_status = 'approved'
       and qv.published_at = v_published
       and dc.delivery_state = 'AVAILABLE'
       and dc.reason is null
       and dc.provenance = v_provenance
       and dc.changed_by = 'system'
       and public.m2b2_question_version_passes_integrity(qv.id, 'gcm-vunesp-pilot')
  ) <> 12
  or exists (
    select 1
      from public.question_versions qv
     where qv.question_id between 1001 and 1012
       and (
         qv.version_number <> 1
         or qv.validation_status is distinct from 'approved'
         or qv.published_at is null
       )
  )
  or (
    select count(*)
      from public.question_version_delivery_controls
     where delivery_state = 'AVAILABLE'
  ) <> 12
  or exists (
    select 1
      from public.question_version_delivery_controls dc
      join public.question_versions qv on qv.id = dc.question_version_id
     where dc.delivery_state = 'AVAILABLE'
       and (
         qv.question_id < 1001
         or qv.question_id > 1012
         or qv.version_number <> 1
       )
  )
  then
    raise exception
      'Fail-closed: post-promotion state is not exactly the 12 approved AVAILABLE pilot versions';
  end if;

  if exists (
    select 1
      from (
        values
          (1001, 'easy', 'C',
            'Quanto é 10% de 350?',
            '10% corresponde a 10/100. Portanto, 350 × 0,10 = 35.',
            '[{"id":"A","text":"25"},{"id":"B","text":"30"},{"id":"C","text":"35"},{"id":"D","text":"40"}]'::jsonb),
          (1002, 'easy', 'B',
            'Um produto custa R$ 80 e recebe desconto de 15%. Qual é o preço final?',
            '15% de 80 é 12. Assim, 80 - 12 = R$ 68.',
            '[{"id":"A","text":"R$ 65"},{"id":"B","text":"R$ 68"},{"id":"C","text":"R$ 70"},{"id":"D","text":"R$ 72"}]'::jsonb),
          (1003, 'easy', 'D',
            'Um valor de R$ 250 sofreu aumento de 8%. Qual é o novo valor?',
            '8% de 250 é 20. O novo valor é 250 + 20 = 270.',
            '[{"id":"A","text":"R$ 258"},{"id":"B","text":"R$ 260"},{"id":"C","text":"R$ 268"},{"id":"D","text":"R$ 270"}]'::jsonb),
          (1004, 'medium', 'B',
            'Se 30% de uma quantidade correspondem a 45, qual é a quantidade total?',
            'Se 30% é 45, então 100% é 45 ÷ 0,30 = 150.',
            '[{"id":"A","text":"135"},{"id":"B","text":"150"},{"id":"C","text":"165"},{"id":"D","text":"180"}]'::jsonb),
          (1005, 'medium', 'C',
            'Um valor passou de 40 para 50. Qual foi o aumento percentual?',
            'O aumento foi 10 sobre o valor inicial 40: 10 ÷ 40 = 0,25 = 25%.',
            '[{"id":"A","text":"20%"},{"id":"B","text":"22,5%"},{"id":"C","text":"25%"},{"id":"D","text":"30%"}]'::jsonb),
          (1006, 'medium', 'B',
            'Um item de R$ 100 recebe dois descontos sucessivos: primeiro 10% e depois 20%. Qual é o preço final?',
            'Após 10%, o valor é 90. Aplicando 20% de desconto sobre 90, chega-se a 72.',
            '[{"id":"A","text":"R$ 70"},{"id":"B","text":"R$ 72"},{"id":"C","text":"R$ 75"},{"id":"D","text":"R$ 80"}]'::jsonb),
          (1007, 'easy', 'B',
            'Em uma turma com 40 alunos, 25% faltaram. Quantos alunos faltaram?',
            '25% equivale a um quarto. Um quarto de 40 é 10.',
            '[{"id":"A","text":"8"},{"id":"B","text":"10"},{"id":"C","text":"12"},{"id":"D","text":"15"}]'::jsonb),
          (1008, 'easy', 'C',
            'Uma prova tem 50 questões e uma candidata acertou 70%. Quantas questões ela acertou?',
            '70% de 50 é 0,70 × 50 = 35.',
            '[{"id":"A","text":"30"},{"id":"B","text":"32"},{"id":"C","text":"35"},{"id":"D","text":"40"}]'::jsonb),
          (1009, 'medium', 'B',
            'Uma média é formada por 70% de uma nota 50 e 30% de uma nota 80. Qual é a média ponderada?',
            '0,70 × 50 = 35 e 0,30 × 80 = 24. A soma é 59.',
            '[{"id":"A","text":"56"},{"id":"B","text":"59"},{"id":"C","text":"62"},{"id":"D","text":"65"}]'::jsonb),
          (1010, 'medium', 'C',
            'Se 20% de um número é 36, qual é esse número?',
            '20% é 0,20. Logo, 36 ÷ 0,20 = 180.',
            '[{"id":"A","text":"144"},{"id":"B","text":"160"},{"id":"C","text":"180"},{"id":"D","text":"200"}]'::jsonb),
          (1011, 'hard', 'C',
            'Após um desconto de 25%, um produto passou a custar R$ 150. Qual era o preço original?',
            'Após desconto de 25%, restam 75% do preço. Então 150 ÷ 0,75 = 200.',
            '[{"id":"A","text":"R$ 180"},{"id":"B","text":"R$ 190"},{"id":"C","text":"R$ 200"},{"id":"D","text":"R$ 225"}]'::jsonb),
          (1012, 'easy', 'C',
            'Em uma pesquisa com 120 pessoas, 60% escolheram determinada opção. Quantas pessoas escolheram essa opção?',
            '60% de 120 é 0,60 × 120 = 72.',
            '[{"id":"A","text":"60"},{"id":"B","text":"66"},{"id":"C","text":"72"},{"id":"D","text":"80"}]'::jsonb)
      ) as expected(question_id, difficulty, correct_answer, statement, explanation, alternatives)
      join public.question_versions qv
        on qv.question_id = expected.question_id
       and qv.version_number = 1
     where qv.difficulty is distinct from expected.difficulty
        or qv.correct_answer is distinct from expected.correct_answer
        or qv.statement is distinct from expected.statement
        or qv.explanation is distinct from expected.explanation
        or qv.alternatives is distinct from expected.alternatives
        or qv.source_type is distinct from 'zynvo_original'
        or qv.source_label is distinct from v_source_label
        or qv.source_version is distinct from v_source_version
  ) then
    raise exception 'Fail-closed: promotion mutated pilot editorial content';
  end if;

  select md5(string_agg(q::text, ',' order by q.id))
    into v_questions_after
    from public.questions q;

  select md5(string_agg(qv::text, ',' order by qv.id))
    into v_other_qv_after
    from public.question_versions qv
   where qv.question_id < 1001
      or qv.question_id > 1012
      or qv.version_number <> 1;

  select md5(string_agg(dc::text, ',' order by dc.question_version_id))
    into v_other_dc_after
    from public.question_version_delivery_controls dc
    join public.question_versions qv on qv.id = dc.question_version_id
   where qv.question_id < 1001
      or qv.question_id > 1012
      or qv.version_number <> 1;

  select md5(string_agg(qvku::text, ',' order by qvku.question_version_id, qvku.knowledge_unit_id))
    into v_map_after
    from public.question_version_knowledge_units qvku;

  select md5(string_agg(qa::text, ',' order by qa.user_id, qa.question_id))
    into v_asg_after
    from public.question_assignments qa;

  select md5(string_agg(qa::text, ',' order by qa.id))
    into v_att_after
    from public.question_attempts qa;

  select md5(string_agg(le::text, ',' order by le.id))
    into v_events_after
    from public.learning_events le;

  select md5(string_agg(ev::text, ',' order by ev.id))
    into v_evidence_after
    from public.learning_evidence ev;

  select md5(string_agg(ea::text, ',' order by ea.id))
    into v_actions_after
    from public.evidence_actions ea;

  if v_questions_before is distinct from v_questions_after
     or v_other_qv_before is distinct from v_other_qv_after
     or v_other_dc_before is distinct from v_other_dc_after
     or v_map_before is distinct from v_map_after
     or v_asg_before is distinct from v_asg_after
     or v_att_before is distinct from v_att_after
     or v_events_before is distinct from v_events_after
     or v_evidence_before is distinct from v_evidence_after
     or v_actions_before is distinct from v_actions_after
  then
    raise exception
      'Fail-closed: promotion touched questions, other versions, mappings, assignments, attempts, or evidence';
  end if;
end;
$promote$;

commit;
