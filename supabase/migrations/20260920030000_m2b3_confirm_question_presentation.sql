-- ZYNVO M2B.3: server-owned presentation confirmation.
-- Does not alter request_question_delivery.
-- Does not cut over QuestionsPage or legacy assign_next_questions.
-- Does not stamp attempts, LearningEvent, or Evidence.
-- Does not promote real pilot QVs 1001–1012.

create function public.confirm_question_presentation(
  p_assignment_id uuid
)
returns table (
  outcome text,
  assignment_id uuid,
  presented_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_exam_id text;
  v_asg_id uuid;
  v_qv_id uuid;
  v_ctx text;
  v_presented_at timestamptz;
  v_answered_at timestamptz;
  v_stamped timestamptz;
begin
  if v_user_id is null or p_assignment_id is null then
    outcome := 'DENIED';
    return next;
    return;
  end if;

  select
    qa.id,
    qa.question_version_id,
    qa.delivery_context,
    qa.presented_at,
    qa.answered_at
    into
      v_asg_id,
      v_qv_id,
      v_ctx,
      v_presented_at,
      v_answered_at
    from public.question_assignments qa
   where qa.id = p_assignment_id
     and qa.user_id = v_user_id
   for update;

  if v_asg_id is null then
    outcome := 'DENIED';
    return next;
    return;
  end if;

  -- Idempotent retry: historical presentation is a fact.
  if v_presented_at is not null then
    outcome := 'CONFIRMED';
    assignment_id := v_asg_id;
    presented_at := v_presented_at;
    return next;
    return;
  end if;

  if v_qv_id is null
     or v_ctx is distinct from 'study'
     or v_answered_at is not null
  then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  select ust.exam_id
    into v_exam_id
    from public.user_study_tracks ust
    join public.exams e on e.id = ust.exam_id
   where ust.user_id = v_user_id
     and e.status = 'published';

  if v_exam_id is null then
    outcome := 'CONTEXT_NOT_READY';
    return next;
    return;
  end if;

  if not public.m2b2_question_version_passes_integrity(v_qv_id, v_exam_id) then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  update public.question_assignments qa
     set presented_at = now()
   where qa.id = v_asg_id
     and qa.user_id = v_user_id
     and qa.presented_at is null
     and qa.answered_at is null
     and qa.delivery_context = 'study'
     and qa.question_version_id is not null
  returning qa.presented_at into v_stamped;

  if v_stamped is not null then
    outcome := 'CONFIRMED';
    assignment_id := v_asg_id;
    presented_at := v_stamped;
    return next;
    return;
  end if;

  select qa.presented_at
    into v_presented_at
    from public.question_assignments qa
   where qa.id = v_asg_id
     and qa.user_id = v_user_id;

  if v_presented_at is not null then
    outcome := 'CONFIRMED';
    assignment_id := v_asg_id;
    presented_at := v_presented_at;
    return next;
    return;
  end if;

  outcome := 'UNAVAILABLE';
  return next;
end;
$$;

revoke all on function public.confirm_question_presentation(uuid)
  from public, anon;

grant execute on function public.confirm_question_presentation(uuid)
  to authenticated;

comment on function public.confirm_question_presentation(uuid) is
  'M2B.3 server-owned presentation confirmation. StudyTrack authority. Stored QV pin. No gabarito. No Evidence.';
