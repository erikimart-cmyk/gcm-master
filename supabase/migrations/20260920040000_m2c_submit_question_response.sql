-- ZYNVO M2C: canonical question response and deterministic evidence.
-- One atomic migration: uniqueness, writer, authenticated INSERT cutover.
-- Does not cut over QuestionsPage or remove legacy p_correct writers.
-- Does not promote real pilot QVs 1001–1012.
-- Does not create UNIQUE(learning_event_id, knowledge_unit_id).

create unique index question_attempts_canonical_assignment_uidx
  on public.question_attempts (question_assignment_id)
  where learning_event_id is not null
    and question_assignment_id is not null;

create unique index question_attempts_canonical_event_uidx
  on public.question_attempts (learning_event_id)
  where learning_event_id is not null;

create function public.submit_question_response(
  p_assignment_id uuid,
  p_selected_answer text,
  p_submission_id uuid
)
returns table (
  outcome text,
  assignment_id uuid,
  attempt_id uuid,
  selected_answer text,
  is_correct boolean,
  correct_answer text,
  explanation text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_ans text;
  v_asg_id uuid;
  v_question_id integer;
  v_qv_id uuid;
  v_ctx text;
  v_presented_at timestamptz;
  v_assignment_answered_at timestamptz;
  v_existing public.question_attempts%rowtype;
  v_canonical_id uuid;
  v_qv_correct text;
  v_qv_expl text;
  v_alts jsonb;
  v_elem jsonb;
  v_id text;
  v_ids text[] := array[]::text[];
  v_keys text[];
  v_dc text;
  v_primary_ku text;
  v_primary_cnt integer;
  v_subject text;
  v_topic text;
  v_attempt_number integer;
  v_event_id uuid;
  v_attempt_id uuid;
  v_correct boolean;
  v_answered_at timestamptz;
  v_profile_ok boolean;
begin
  if v_user_id is null
     or p_assignment_id is null
     or p_submission_id is null
     or p_selected_answer is null
  then
    outcome := 'DENIED';
    return next;
    return;
  end if;

  v_ans := trim(p_selected_answer);

  select
    qa.id,
    qa.question_id,
    qa.question_version_id,
    qa.delivery_context,
    qa.presented_at,
    qa.answered_at
    into
      v_asg_id,
      v_question_id,
      v_qv_id,
      v_ctx,
      v_presented_at,
      v_assignment_answered_at
    from public.question_assignments qa
   where qa.id = p_assignment_id
     and qa.user_id = v_user_id
   for update;

  if v_asg_id is null then
    outcome := 'DENIED';
    return next;
    return;
  end if;

  select qa.*
    into v_existing
    from public.question_attempts qa
   where qa.user_id = v_user_id
     and qa.submission_id = p_submission_id;

  if found then
    if v_existing.question_assignment_id is distinct from v_asg_id then
      outcome := 'CONFLICT';
      return next;
      return;
    end if;

    if trim(v_existing.selected_answer) is distinct from v_ans then
      outcome := 'CONFLICT';
      return next;
      return;
    end if;

    -- Identical replay: historical grade from persisted attempt.
    select dc.delivery_state
      into v_dc
      from public.question_version_delivery_controls dc
     where dc.question_version_id = v_existing.question_version_id;

    outcome := 'RECORDED';
    assignment_id := v_asg_id;
    attempt_id := v_existing.id;
    selected_answer := v_existing.selected_answer;
    is_correct := v_existing.correct;
    if v_dc is not distinct from 'AVAILABLE' then
      select qv.correct_answer, qv.explanation
        into correct_answer, explanation
        from public.question_versions qv
       where qv.id = v_existing.question_version_id;
    end if;
    return next;
    return;
  end if;

  select qa.id
    into v_canonical_id
    from public.question_attempts qa
   where qa.question_assignment_id = v_asg_id
     and qa.learning_event_id is not null;

  if v_assignment_answered_at is not null or v_canonical_id is not null then
    outcome := 'CONFLICT';
    return next;
    return;
  end if;

  if v_ctx is distinct from 'study'
     or v_presented_at is null
     or v_qv_id is null
  then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  select qv.correct_answer, qv.explanation, qv.alternatives, s.name, t.name
    into v_qv_correct, v_qv_expl, v_alts, v_subject, v_topic
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    join public.subjects s on s.id = q.subject_id
    join public.topics t on t.id = q.topic_id
   where qv.id = v_qv_id
     and qv.question_id = v_question_id;

  if v_qv_correct is null or v_alts is null or v_subject is null then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  if v_ans is null or char_length(v_ans) not between 1 and 8 then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  if jsonb_typeof(v_alts) is distinct from 'array'
     or jsonb_array_length(v_alts) < 2
  then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  for v_elem in select jsonb_array_elements(v_alts)
  loop
    if jsonb_typeof(v_elem) is distinct from 'object' then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    select array_agg(k order by k)
      into v_keys
      from jsonb_object_keys(v_elem) as k;

    if v_keys is distinct from array['id', 'text']::text[] then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    if jsonb_typeof(v_elem -> 'id') is distinct from 'string' then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    v_id := trim(v_elem ->> 'id');
    if v_id is null
       or char_length(v_id) not between 1 and 8
       or v_id = any (v_ids)
    then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    v_ids := v_ids || v_id;
  end loop;

  if not (v_ans = any (v_ids)) then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  v_correct := (v_ans = trim(v_qv_correct));

  select dc.delivery_state
    into v_dc
    from public.question_version_delivery_controls dc
   where dc.question_version_id = v_qv_id;

  select count(*), min(qvku.knowledge_unit_id)
    into v_primary_cnt, v_primary_ku
    from public.question_version_knowledge_units qvku
    join public.knowledge_units ku on ku.id = qvku.knowledge_unit_id
   where qvku.question_version_id = v_qv_id
     and qvku.role = 'primary'
     and ku.status = 'published';

  select exists (
    select 1 from public.profiles p where p.id = v_user_id
  ) into v_profile_ok;

  if not v_profile_ok then
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  select coalesce(max(qa.attempt_number), 0) + 1
    into v_attempt_number
    from public.question_attempts qa
   where qa.user_id = v_user_id
     and qa.question_id = v_question_id;

  v_answered_at := now();

  begin
    insert into public.learning_events (
      profile_id, journey_id, event_type, occurred_at
    ) values (
      v_user_id, null, 'question_attempt', v_answered_at
    )
    returning id into v_event_id;

    insert into public.question_attempts (
      user_id,
      question_id,
      subject,
      topic,
      correct,
      answered_at,
      attempt_number,
      is_review,
      learning_event_id,
      question_version_id,
      question_assignment_id,
      selected_answer,
      submission_id,
      started_at
    ) values (
      v_user_id,
      v_question_id,
      v_subject,
      v_topic,
      v_correct,
      v_answered_at,
      v_attempt_number,
      false,
      v_event_id,
      v_qv_id,
      v_asg_id,
      v_ans,
      p_submission_id,
      null
    )
    returning id into v_attempt_id;

    if v_dc is not distinct from 'AVAILABLE'
       and v_primary_cnt = 1
       and v_primary_ku is not null
    then
      insert into public.learning_evidence (
        profile_id,
        learning_event_id,
        knowledge_unit_id,
        stage,
        observation,
        strength,
        assistance_context,
        timing_interpretation,
        producer_type,
        producer_version,
        observed_at
      ) values (
        v_user_id,
        v_event_id,
        v_primary_ku,
        'comprehension',
        case when v_correct then 'success' else 'difficulty' end,
        'weak',
        'unknown',
        'unknown',
        'deterministic_rule',
        'm2c-v1',
        v_answered_at
      );
    end if;

    update public.question_assignments qa
       set answered_at = v_answered_at
     where qa.id = v_asg_id
       and qa.user_id = v_user_id
       and qa.answered_at is null;
  exception
    when unique_violation then
      select qa.*
        into v_existing
        from public.question_attempts qa
       where qa.user_id = v_user_id
         and qa.submission_id = p_submission_id;

      if not found
         or v_existing.question_assignment_id is distinct from v_asg_id
         or trim(v_existing.selected_answer) is distinct from v_ans
      then
        outcome := 'CONFLICT';
        return next;
        return;
      end if;

      select dc.delivery_state
        into v_dc
        from public.question_version_delivery_controls dc
       where dc.question_version_id = v_existing.question_version_id;

      outcome := 'RECORDED';
      assignment_id := v_asg_id;
      attempt_id := v_existing.id;
      selected_answer := v_existing.selected_answer;
      is_correct := v_existing.correct;
      if v_dc is not distinct from 'AVAILABLE' then
        select qv.correct_answer, qv.explanation
          into correct_answer, explanation
          from public.question_versions qv
         where qv.id = v_existing.question_version_id;
      end if;
      return next;
      return;
  end;

  outcome := 'RECORDED';
  assignment_id := v_asg_id;
  attempt_id := v_attempt_id;
  selected_answer := v_ans;
  is_correct := v_correct;
  if v_dc is not distinct from 'AVAILABLE' then
    correct_answer := v_qv_correct;
    explanation := v_qv_expl;
  end if;
  return next;
end;
$$;

revoke all on function public.submit_question_response(uuid, text, uuid)
  from public, anon;

grant execute on function public.submit_question_response(uuid, text, uuid)
  to authenticated;

comment on function public.submit_question_response(uuid, text, uuid) is
  'M2C canonical question response. Server grade. Optional deterministic evidence. No p_correct.';

revoke insert on table public.question_attempts from authenticated;

drop policy if exists "Students can create their question attempts"
  on public.question_attempts;
