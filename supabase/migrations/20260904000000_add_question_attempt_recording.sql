-- Records an immutable answer for the authenticated student. The attempt
-- number is assigned in the database so the client cannot forge ownership or
-- accidentally reuse a number after a reload.
create function public.record_question_attempt(
  p_question_id integer,
  p_subject text,
  p_correct boolean,
  p_is_review boolean default false
)
returns table (
  question_id integer,
  subject text,
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
  v_attempt_number integer;
  v_retry integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to record a question attempt';
  end if;

  -- Concurrent devices may answer the same question at the same time. The
  -- unique constraint remains the source of truth; retry if it wins the race.
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
        correct,
        attempt_number,
        is_review
      )
      values (
        v_user_id,
        p_question_id,
        p_subject,
        p_correct,
        v_attempt_number,
        p_is_review
      )
      returning
        question_attempts.question_id,
        question_attempts.subject,
        question_attempts.correct,
        question_attempts.answered_at,
        question_attempts.attempt_number,
        question_attempts.is_review;

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

revoke all on function public.record_question_attempt(integer, text, boolean, boolean)
  from public, anon;

grant execute on function public.record_question_attempt(integer, text, boolean, boolean)
  to authenticated;
