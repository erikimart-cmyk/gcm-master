-- `review_content_id` is also an output column of the function, so use the
-- named primary-key constraint instead of an ambiguous conflict-column list.
create or replace function public.record_review_content_progress(
  p_review_content_id uuid,
  p_completed boolean default false
)
returns table (
  review_content_id uuid,
  opened_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required to record review content progress';
  end if;

  if not exists (
    select 1
    from public.review_contents content
    where content.id = p_review_content_id
      and content.status = 'published'
  ) then
    raise exception 'The requested review content is not published';
  end if;

  insert into public.user_content_progress (
    user_id,
    review_content_id,
    completed_at
  )
  values (
    v_user_id,
    p_review_content_id,
    case when p_completed then now() else null end
  )
  on conflict on constraint user_content_progress_pkey do update
  set completed_at = case
    when p_completed and public.user_content_progress.completed_at is null
      then now()
    else public.user_content_progress.completed_at
  end;

  return query
  select
    progress.review_content_id,
    progress.opened_at,
    progress.completed_at
  from public.user_content_progress progress
  where progress.user_id = v_user_id
    and progress.review_content_id = p_review_content_id;
end;
$$;
