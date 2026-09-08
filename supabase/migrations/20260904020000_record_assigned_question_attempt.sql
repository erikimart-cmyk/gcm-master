-- Records answers for catalog-assigned questions. Subject and topic are read
-- from the published catalog, never trusted from the browser.
create function public.record_assigned_question_attempt(
  p_question_id integer,
  p_correct boolean,
  p_is_review boolean default false
)
returns table (
  question_id integer,
  subject text,
  topic text,
  correct boolean,
  answered_at timestamptz,
  attempt_number integer,
  is_review boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_subject text;
  v_topic text;
  v_attempt_number integer;
  v_retry integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to record a question attempt';
  end if;

  select s.name, t.name
    into v_subject, v_topic
    from public.question_assignments qa
    join public.questions q on q.id = qa.question_id
    join public.subjects s on s.id = q.subject_id
    join public.topics t on t.id = q.topic_id
    where qa.user_id = v_user_id
      and qa.question_id = p_question_id;

  if not found then
    raise exception 'The question was not assigned to the authenticated student';
  end if;

  for v_retry in 1..3 loop
    select coalesce(max(qa.attempt_number), 0) + 1
      into v_attempt_number
      from public.question_attempts qa
      where qa.user_id = v_user_id
        and qa.question_id = p_question_id;

    begin
      return query
      insert into public.question_attempts (
        user_id,
        question_id,
        subject,
        topic,
        correct,
        attempt_number,
        is_review
      )
      values (
        v_user_id,
        p_question_id,
        v_subject,
        v_topic,
        p_correct,
        v_attempt_number,
        p_is_review
      )
      returning
        question_attempts.question_id,
        question_attempts.subject,
        question_attempts.topic,
        question_attempts.correct,
        question_attempts.answered_at,
        question_attempts.attempt_number,
        question_attempts.is_review;

      update public.question_assignments
      set
        started_at = coalesce(started_at, now()),
        answered_at = now()
      where user_id = v_user_id
        and question_id = p_question_id;

      return;
    exception
      when unique_violation then
        if v_retry = 3 then
          raise;
        end if;
    end;
  end loop;
end;
$$;

revoke all on function public.record_assigned_question_attempt(integer, boolean, boolean)
  from public, anon;

grant execute on function public.record_assigned_question_attempt(integer, boolean, boolean)
  to authenticated;
