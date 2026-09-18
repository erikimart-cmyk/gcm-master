-- ZYNVO M2A.3: Additive bridge on question_assignments and question_attempts.
-- Preserves historical composite PK on question_assignments (user_id, question_id).
-- Does not backfill QuestionVersion, presented_at, LearningEvent, or Evidence.
-- Does not add question_id → questions FK (static catalog IDs remain possible).

alter table public.question_assignments
  add column id uuid not null default gen_random_uuid();

alter table public.question_assignments
  add constraint question_assignments_id_key unique (id);

alter table public.question_assignments
  add column question_version_id uuid
    references public.question_versions (id) on delete restrict;

alter table public.question_assignments
  add column presented_at timestamptz;

comment on column public.question_assignments.id is
  'Technical assignment identity for M2. Not historical presentation or Evidence.';

comment on column public.question_assignments.question_version_id is
  'Filled only by the future M2B authorization/presentation flow. Historical rows stay NULL.';

comment on column public.question_assignments.presented_at is
  'Presentation time for M2B. Not assigned_at and not started_at.';

alter table public.question_attempts
  add column learning_event_id uuid
    references public.learning_events (id) on delete restrict;

alter table public.question_attempts
  add column question_version_id uuid
    references public.question_versions (id) on delete restrict;

alter table public.question_attempts
  add column question_assignment_id uuid
    references public.question_assignments (id) on delete restrict;

alter table public.question_attempts
  add column selected_answer text;

alter table public.question_attempts
  add column submission_id uuid;

alter table public.question_attempts
  add column started_at timestamptz;

alter table public.question_attempts
  add constraint question_attempts_canonical_bridge_check
  check (
    learning_event_id is null
    or (
      question_version_id is not null
      and question_assignment_id is not null
      and selected_answer is not null
      and char_length(trim(selected_answer)) between 1 and 8
      and submission_id is not null
    )
  );

create unique index question_attempts_user_submission_id_uidx
  on public.question_attempts (user_id, submission_id)
  where submission_id is not null;

comment on column public.question_attempts.learning_event_id is
  'NULL marks a legacy attempt. Non-null requires the canonical M2 bridge fields.';

comment on column public.question_attempts.submission_id is
  'Technical idempotency key. Distinct from pedagogical attempt_number.';
