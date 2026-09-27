-- ZYNVO M2B: three approved editorial copy adjustments on pilot QV v1.
-- Does not promote QuestionVersions. Does not change DeliveryControl.
-- Does not rewrite public.questions (legacy snapshot remains for assign_next_questions).
-- Does not alter validation_status, published_at, or delivery_state.

begin;

do $copy$
declare
  v_qv_id uuid;
  v_status text;
  v_published timestamptz;
  v_state text;
  v_current_explanation text;
  v_current_statement text;
  v_correct text;
  v_updated integer;
begin
  -- 1002: monetary result in explanation. Key B / R$ 68 unchanged.
  select qv.id, qv.validation_status, qv.published_at, qv.explanation,
         qv.correct_answer, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_explanation, v_correct, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1002
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_correct is distinct from 'B'
     or v_current_explanation is distinct from
       '15% de 80 é 12. Assim, 80 - 12 = 68.'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1002 v1 is not a mutable unpublished HOLD draft with the expected explanation';
  end if;

  update public.question_versions
     set explanation = '15% de 80 é 12. Assim, 80 - 12 = R$ 68.'
   where id = v_qv_id
     and version_number = 1
     and validation_status = 'draft'
     and published_at is null
     and correct_answer = 'B'
     and explanation = '15% de 80 é 12. Assim, 80 - 12 = 68.';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1002 explanation update matched % rows', v_updated;
  end if;

  -- 1003: replace ambiguous "taxa" with "valor". Key D / R$ 270 unchanged.
  select qv.id, qv.validation_status, qv.published_at, qv.statement,
         qv.correct_answer, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_statement, v_correct, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1003
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_correct is distinct from 'D'
     or v_current_statement is distinct from
       'Uma taxa de R$ 250 sofreu aumento de 8%. Qual é o novo valor?'
     or exists (
       select 1 from public.question_attempts a where a.question_version_id = v_qv_id
     )
     or exists (
       select 1 from public.question_assignments a where a.question_version_id = v_qv_id
     )
  then
    raise exception
      'Fail-closed: QV 1003 v1 is not a mutable unpublished HOLD draft with the expected statement';
  end if;

  update public.question_versions
     set statement =
       'Um valor de R$ 250 sofreu aumento de 8%. Qual é o novo valor?'
   where id = v_qv_id
     and version_number = 1
     and validation_status = 'draft'
     and published_at is null
     and correct_answer = 'D'
     and statement =
       'Uma taxa de R$ 250 sofreu aumento de 8%. Qual é o novo valor?';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Fail-closed: QV 1003 statement update matched % rows', v_updated;
  end if;

  -- 1012: keep canonical QV wording (do not reintroduce "opção A"). Key C / 72.
  select qv.id, qv.validation_status, qv.published_at, qv.statement,
         qv.correct_answer, dc.delivery_state
    into v_qv_id, v_status, v_published, v_current_statement, v_correct, v_state
    from public.question_versions qv
    left join public.question_version_delivery_controls dc
      on dc.question_version_id = qv.id
   where qv.question_id = 1012
     and qv.version_number = 1;

  if v_qv_id is null
     or v_status is distinct from 'draft'
     or v_published is not null
     or v_state is distinct from 'HOLD'
     or v_correct is distinct from 'C'
     or v_current_statement is distinct from
       'Em uma pesquisa com 120 pessoas, 60% escolheram determinada opção. Quantas pessoas escolheram essa opção?'
  then
    raise exception
      'Fail-closed: QV 1012 v1 is not the approved HOLD draft wording';
  end if;

  -- Guard: editorial/operational states of 1001–1012 remain draft + HOLD.
  if exists (
    select 1
      from public.question_versions qv
      join public.question_version_delivery_controls dc
        on dc.question_version_id = qv.id
     where qv.question_id between 1001 and 1012
       and qv.version_number = 1
       and (
         qv.validation_status is distinct from 'draft'
         or qv.published_at is not null
         or dc.delivery_state is distinct from 'HOLD'
       )
  ) then
    raise exception 'Fail-closed: pilot QV editorial/operational state mutated';
  end if;

  if exists (
    select 1 from public.question_version_delivery_controls
     where delivery_state = 'AVAILABLE'
  ) then
    raise exception 'Fail-closed: unexpected AVAILABLE delivery control';
  end if;
end;
$copy$;

commit;
