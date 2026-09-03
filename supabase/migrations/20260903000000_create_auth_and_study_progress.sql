-- ZYNVO: identity-owned study progress foundation.
-- This migration intentionally stores study facts only. Dashboard metrics,
-- subject performance and priorities remain derived by the application.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(trim(display_name)) between 1 and 80)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.study_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal_id text not null,
  selected_at timestamptz not null default now(),
  constraint study_goals_goal_id_check
    check (
      goal_id in (
        'concursos',
        'idiomas',
        'tecnologia',
        'novas-habilidades',
        'carreira',
        'explorar'
      )
    )
);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id integer not null check (question_id > 0),
  subject text not null check (char_length(trim(subject)) between 1 and 120),
  correct boolean not null,
  answered_at timestamptz not null default now(),
  attempt_number integer not null check (attempt_number > 0),
  is_review boolean not null default false,
  created_at timestamptz not null default now(),
  constraint question_attempts_user_question_attempt_unique
    unique (user_id, question_id, attempt_number)
);

create index question_attempts_user_answered_at_idx
  on public.question_attempts (user_id, answered_at desc);

create index question_attempts_user_question_attempt_idx
  on public.question_attempts (user_id, question_id, attempt_number desc);

alter table public.profiles enable row level security;
alter table public.study_goals enable row level security;
alter table public.question_attempts enable row level security;

-- RLS decides which rows a signed-in student may reach. Grants below decide
-- which operations the authenticated client role may request.
revoke all on table public.profiles from anon;
revoke all on table public.study_goals from anon;
revoke all on table public.question_attempts from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.study_goals to authenticated;
grant select, insert on table public.question_attempts to authenticated;

create policy "Students can read their profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Students can create their profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Students can update their profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Students can read their study goal"
on public.study_goals
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Students can create their study goal"
on public.study_goals
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Students can update their study goal"
on public.study_goals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Students can read their question attempts"
on public.question_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Students can create their question attempts"
on public.question_attempts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

comment on table public.profiles is
  'Minimal, user-owned profile data. Authentication credentials remain in auth.users.';

comment on table public.study_goals is
  'One current StudyGoal per student. Goal copy remains versioned in the application catalog.';

comment on table public.question_attempts is
  'Immutable study events. Dashboard and review data are derived from these facts.';
