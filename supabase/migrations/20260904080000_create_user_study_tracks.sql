-- Stores the active concrete study track chosen within a broad objective such
-- as "Concursos". A user owns only their current active track in this first
-- version; the catalog remains independently extensible.
create table public.user_study_tracks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  exam_id text not null references public.exams (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_study_tracks_set_updated_at
before update on public.user_study_tracks
for each row
execute function public.set_updated_at();

alter table public.user_study_tracks enable row level security;

revoke all on table public.user_study_tracks from anon;
grant select, insert, update on table public.user_study_tracks to authenticated;

create policy "Students can read their active study track"
on public.user_study_tracks
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Students can create their active study track"
on public.user_study_tracks
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Students can update their active study track"
on public.user_study_tracks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
