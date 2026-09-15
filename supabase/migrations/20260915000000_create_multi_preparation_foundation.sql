-- ZYNVO M1: multi-preparation foundation (journeys, targets, journey_targets).
-- Additive only. Does not alter legacy study_goals, user_study_tracks, exams, or RPCs.

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  status text not null,
  is_primary boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journeys_title_length
    check (char_length(trim(title)) between 1 and 120),
  constraint journeys_description_length
    check (description is null or char_length(description) <= 1000),
  constraint journeys_status_check
    check (status in ('defining', 'active', 'paused', 'completed', 'closed'))
);

create index journeys_profile_id_idx
  on public.journeys (profile_id);

create unique index journeys_one_open_primary_per_profile_idx
  on public.journeys (profile_id)
  where is_primary and status in ('defining', 'active', 'paused');

create trigger journeys_set_updated_at
before update on public.journeys
for each row
execute function public.set_updated_at();

create table public.targets (
  id text primary key,
  category text not null,
  name text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint targets_id_format
    check (
      char_length(id) between 2 and 64
      and id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  constraint targets_name_length
    check (char_length(trim(name)) between 1 and 160),
  constraint targets_category_check
    check (
      category in (
        'assessment',
        'admission',
        'career_entry',
        'academic',
        'certification',
        'learning'
      )
    ),
  constraint targets_status_check
    check (status in ('draft', 'published', 'archived'))
);

create trigger targets_set_updated_at
before update on public.targets
for each row
execute function public.set_updated_at();

create table public.journey_targets (
  journey_id uuid not null references public.journeys (id) on delete cascade,
  target_id text not null references public.targets (id) on delete restrict,
  role text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (journey_id, target_id),
  constraint journey_targets_role_check
    check (role in ('primary', 'secondary', 'monitored')),
  constraint journey_targets_status_check
    check (status in ('active', 'removed'))
);

create index journey_targets_target_id_idx
  on public.journey_targets (target_id);

create trigger journey_targets_set_updated_at
before update on public.journey_targets
for each row
execute function public.set_updated_at();

alter table public.journeys enable row level security;
alter table public.targets enable row level security;
alter table public.journey_targets enable row level security;

revoke all on table public.journeys from anon, authenticated, public;
revoke all on table public.targets from anon, authenticated, public;
revoke all on table public.journey_targets from anon, authenticated, public;

grant select, insert, update on table public.journeys to authenticated;
grant select on table public.targets to authenticated;
grant select, insert, update on table public.journey_targets to authenticated;

create policy "Students can read their journeys"
on public.journeys
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy "Students can create their journeys"
on public.journeys
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

create policy "Students can update their journeys"
on public.journeys
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "Students can read published targets"
on public.targets
for select
to authenticated
using (status = 'published');

create policy "Students can read their journey targets"
on public.journey_targets
for select
to authenticated
using (
  exists (
    select 1
    from public.journeys j
    where j.id = journey_targets.journey_id
      and j.profile_id = (select auth.uid())
  )
);

create policy "Students can create their journey targets"
on public.journey_targets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.journeys j
    where j.id = journey_targets.journey_id
      and j.profile_id = (select auth.uid())
  )
);

create policy "Students can update their journey targets"
on public.journey_targets
for update
to authenticated
using (
  exists (
    select 1
    from public.journeys j
    where j.id = journey_targets.journey_id
      and j.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.journeys j
    where j.id = journey_targets.journey_id
      and j.profile_id = (select auth.uid())
  )
);

insert into public.targets (id, category, name, status)
values (
  'gcm-limeira-02-2026',
  'career_entry',
  'Prefeitura de Limeira — GCM 3ª Classe (02/2026)',
  'published'
);

comment on table public.journeys is
  'Profile-owned preparation journeys. Not a StudyGoal and not a StudyTrack.';

comment on table public.targets is
  'Shared editorial catalog of preparation targets. Distinct from exams.';

comment on table public.journey_targets is
  'N:N link between a journey and catalog targets. role belongs to the relation.';
