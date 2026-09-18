-- ZYNVO M2A.2: LearningEvent, LearningEvidence, EvidenceAction.
-- Additive only. Does not generate historical evidence.
-- Application-level append-only: no client INSERT/UPDATE/DELETE.

create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  journey_id uuid references public.journeys (id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint learning_events_event_type_check
    check (event_type = 'question_attempt')
);

create index learning_events_profile_occurred_at_idx
  on public.learning_events (profile_id, occurred_at desc);

create index learning_events_journey_occurred_at_idx
  on public.learning_events (journey_id, occurred_at desc)
  where journey_id is not null;

create function public.enforce_learning_event_journey_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.journey_id is not null then
    if not exists (
      select 1
      from public.journeys j
      where j.id = new.journey_id
        and j.profile_id = new.profile_id
    ) then
      raise exception
        'learning_events.journey_id must belong to the same profile';
    end if;
  end if;

  return new;
end;
$$;

create trigger learning_events_enforce_journey_profile
before insert or update on public.learning_events
for each row
execute function public.enforce_learning_event_journey_profile();

create table public.learning_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  learning_event_id uuid not null
    references public.learning_events (id) on delete cascade,
  knowledge_unit_id text not null
    references public.knowledge_units (id) on delete restrict,
  stage text not null,
  observation text not null,
  strength text not null,
  assistance_context text not null,
  timing_interpretation text not null,
  producer_type text not null,
  producer_version text not null,
  observed_at timestamptz not null,
  generated_at timestamptz not null default now(),
  constraint learning_evidence_stage_check
    check (
      stage in (
        'exposure',
        'comprehension',
        'application',
        'retention'
      )
    ),
  constraint learning_evidence_observation_check
    check (
      observation in (
        'observed',
        'success',
        'difficulty'
      )
    ),
  constraint learning_evidence_strength_check
    check (strength in ('weak', 'moderate', 'strong')),
  constraint learning_evidence_assistance_context_check
    check (
      assistance_context in (
        'unknown',
        'independent',
        'hinted',
        'guided',
        'explanation_available',
        'explanation_seen',
        'answer_exposed'
      )
    ),
  constraint learning_evidence_timing_interpretation_check
    check (
      timing_interpretation in (
        'unknown',
        'comparable',
        'adapted',
        'unreliable'
      )
    ),
  constraint learning_evidence_producer_type_check
    check (producer_type = 'deterministic_rule'),
  constraint learning_evidence_producer_version_length
    check (char_length(trim(producer_version)) between 1 and 64)
);

create index learning_evidence_profile_observed_at_idx
  on public.learning_evidence (profile_id, observed_at desc);

create index learning_evidence_knowledge_unit_observed_at_idx
  on public.learning_evidence (knowledge_unit_id, observed_at desc);

create index learning_evidence_profile_knowledge_unit_observed_at_idx
  on public.learning_evidence (profile_id, knowledge_unit_id, observed_at desc);

create function public.enforce_learning_evidence_event_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.learning_events e
    where e.id = new.learning_event_id
      and e.profile_id = new.profile_id
  ) then
    raise exception
      'learning_evidence.profile_id must match learning_events.profile_id';
  end if;

  return new;
end;
$$;

create trigger learning_evidence_enforce_event_profile
before insert or update on public.learning_evidence
for each row
execute function public.enforce_learning_evidence_event_profile();

create table public.evidence_actions (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null
    references public.learning_evidence (id) on delete cascade,
  action text not null,
  replacement_evidence_id uuid
    references public.learning_evidence (id) on delete restrict,
  reason text not null,
  producer_type text not null,
  producer_version text not null,
  created_at timestamptz not null default now(),
  constraint evidence_actions_action_check
    check (action in ('invalidate', 'supersede')),
  constraint evidence_actions_invalidate_replacement_null
    check (
      action <> 'invalidate'
      or replacement_evidence_id is null
    ),
  constraint evidence_actions_supersede_replacement_not_null
    check (
      action <> 'supersede'
      or replacement_evidence_id is not null
    ),
  constraint evidence_actions_no_self_replacement
    check (
      replacement_evidence_id is null
      or replacement_evidence_id <> evidence_id
    ),
  constraint evidence_actions_reason_length
    check (char_length(trim(reason)) between 1 and 1000),
  constraint evidence_actions_producer_type_check
    check (producer_type = 'deterministic_rule'),
  constraint evidence_actions_producer_version_length
    check (char_length(trim(producer_version)) between 1 and 64)
);

create index evidence_actions_evidence_created_at_idx
  on public.evidence_actions (evidence_id, created_at desc);

create function public.enforce_evidence_action_same_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.action = 'supersede' then
    if not exists (
      select 1
      from public.learning_evidence original
      join public.learning_evidence replacement
        on replacement.id = new.replacement_evidence_id
      where original.id = new.evidence_id
        and original.profile_id = replacement.profile_id
    ) then
      raise exception
        'evidence_actions replacement must belong to the same profile';
    end if;
  end if;

  return new;
end;
$$;

create trigger evidence_actions_enforce_same_profile
before insert or update on public.evidence_actions
for each row
execute function public.enforce_evidence_action_same_profile();

alter table public.learning_events enable row level security;
alter table public.learning_evidence enable row level security;
alter table public.evidence_actions enable row level security;

revoke all on table public.learning_events from anon, authenticated, public;
revoke all on table public.learning_evidence from anon, authenticated, public;
revoke all on table public.evidence_actions from anon, authenticated, public;

grant select on table public.learning_events to authenticated;
grant select on table public.learning_evidence to authenticated;

create policy "Students can read their learning events"
on public.learning_events
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy "Students can read their learning evidence"
on public.learning_evidence
for select
to authenticated
using ((select auth.uid()) = profile_id);

revoke all on function public.enforce_learning_event_journey_profile()
  from public, anon, authenticated;

revoke all on function public.enforce_learning_evidence_event_profile()
  from public, anon, authenticated;

revoke all on function public.enforce_evidence_action_same_profile()
  from public, anon, authenticated;

comment on table public.learning_events is
  'Educational facts that something happened. M2 v1 event_type is question_attempt only. Not mastery.';

comment on table public.learning_evidence is
  'Controlled pedagogical meaning derived from a LearningEvent. Append-only for application roles.';

comment on table public.evidence_actions is
  'Append-only invalidate/supersede trail for LearningEvidence. Not a client write surface.';
