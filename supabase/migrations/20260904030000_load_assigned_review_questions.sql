create function public.load_assigned_review_questions()
returns table (
  id integer,
  country text,
  language text,
  bank_id text,
  exam_name text,
  position_name text,
  subject text,
  topic text,
  difficulty text,
  statement text,
  alternatives jsonb,
  correct_answer text,
  explanation text
)
language sql
security definer
set search_path = ''
as $$
  with latest_attempts as (
    select distinct on (qa.question_id)
      qa.question_id,
      qa.correct
    from public.question_attempts qa
    where qa.user_id = auth.uid()
    order by qa.question_id, qa.attempt_number desc
  )
  select
    q.id,
    q.country,
    q.language,
    q.bank_id,
    q.exam_name,
    q.position_name,
    s.name,
    t.name,
    q.difficulty,
    q.statement,
    q.alternatives,
    q.correct_answer,
    q.explanation
  from latest_attempts la
  join public.question_assignments assignment
    on assignment.user_id = auth.uid()
   and assignment.question_id = la.question_id
  join public.questions q on q.id = la.question_id
  join public.subjects s on s.id = q.subject_id
  join public.topics t on t.id = q.topic_id
  where la.correct = false
  order by q.exam_id, q.id;
$$;

revoke all on function public.load_assigned_review_questions() from public, anon;
grant execute on function public.load_assigned_review_questions() to authenticated;
