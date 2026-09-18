-- ZYNVO M2A.1: KnowledgeUnit + QuestionVersion foundation.
-- Additive only. Does not backfill versions from public.questions.
-- Does not change delivery RPCs or client grants on public.questions.

create table public.knowledge_units (
  id text primary key,
  name text not null,
  description text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_units_id_format
    check (
      char_length(id) between 2 and 96
      and id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  constraint knowledge_units_name_length
    check (char_length(trim(name)) between 1 and 160),
  constraint knowledge_units_description_length
    check (description is null or char_length(description) <= 1000),
  constraint knowledge_units_status_check
    check (status in ('draft', 'published', 'archived'))
);

create trigger knowledge_units_set_updated_at
before update on public.knowledge_units
for each row
execute function public.set_updated_at();

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id integer not null references public.questions (id) on delete restrict,
  version_number integer not null,
  statement text not null,
  alternatives jsonb not null,
  correct_answer text not null,
  explanation text not null,
  difficulty text not null,
  source_type text not null,
  source_label text,
  source_version text,
  validation_status text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint question_versions_version_number_positive
    check (version_number > 0),
  constraint question_versions_question_version_unique
    unique (question_id, version_number),
  constraint question_versions_statement_length
    check (char_length(trim(statement)) between 1 and 8000),
  constraint question_versions_correct_answer_length
    check (char_length(trim(correct_answer)) between 1 and 8),
  constraint question_versions_explanation_length
    check (char_length(trim(explanation)) between 1 and 8000),
  constraint question_versions_alternatives_array
    check (
      jsonb_typeof(alternatives) = 'array'
      and jsonb_array_length(alternatives) >= 2
    ),
  constraint question_versions_difficulty_check
    check (difficulty in ('easy', 'medium', 'hard')),
  constraint question_versions_source_type_check
    check (
      source_type in (
        'zynvo_original',
        'official',
        'licensed',
        'specialist',
        'ai_assisted',
        'imported'
      )
    ),
  constraint question_versions_validation_status_check
    check (
      validation_status in (
        'draft',
        'under_validation',
        'approved',
        'rejected'
      )
    ),
  constraint question_versions_published_requires_approved
    check (
      published_at is null
      or validation_status = 'approved'
    )
);

create table public.question_version_knowledge_units (
  question_version_id uuid not null
    references public.question_versions (id) on delete cascade,
  knowledge_unit_id text not null
    references public.knowledge_units (id) on delete restrict,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (question_version_id, knowledge_unit_id),
  constraint question_version_knowledge_units_role_check
    check (role in ('primary', 'supporting'))
);

create index question_version_knowledge_units_knowledge_unit_id_idx
  on public.question_version_knowledge_units (knowledge_unit_id);

create function public.prevent_published_question_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.published_at is not null then
      raise exception
        'Published question versions are immutable';
    end if;
    return old;
  end if;

  if old.published_at is not null then
    if new.published_at is distinct from old.published_at
      or new.validation_status is distinct from old.validation_status
      or new.question_id is distinct from old.question_id
      or new.version_number is distinct from old.version_number
      or new.statement is distinct from old.statement
      or new.alternatives is distinct from old.alternatives
      or new.correct_answer is distinct from old.correct_answer
      or new.explanation is distinct from old.explanation
      or new.difficulty is distinct from old.difficulty
      or new.source_type is distinct from old.source_type
      or new.source_label is distinct from old.source_label
      or new.source_version is distinct from old.source_version
    then
      raise exception
        'Published question versions are immutable';
    end if;
  end if;

  return new;
end;
$$;

create trigger question_versions_prevent_published_mutation
before update or delete on public.question_versions
for each row
execute function public.prevent_published_question_version_mutation();

create function public.prevent_published_question_version_mapping_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_published_at timestamptz;
  v_version_id uuid;
begin
  v_version_id := case
    when tg_op = 'INSERT' then new.question_version_id
    else old.question_version_id
  end;

  select qv.published_at
    into v_published_at
    from public.question_versions qv
   where qv.id = v_version_id;

  if v_published_at is not null then
    raise exception
      'Published question version knowledge mappings are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger question_version_knowledge_units_prevent_published_mutation
before insert or update or delete on public.question_version_knowledge_units
for each row
execute function public.prevent_published_question_version_mapping_mutation();

alter table public.knowledge_units enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_version_knowledge_units enable row level security;

revoke all on table public.knowledge_units from anon, authenticated, public;
revoke all on table public.question_versions from anon, authenticated, public;
revoke all on table public.question_version_knowledge_units
  from anon, authenticated, public;

grant select on table public.knowledge_units to authenticated;

create policy "Students can read published knowledge units"
on public.knowledge_units
for select
to authenticated
using (status = 'published');

comment on table public.knowledge_units is
  'Editorial knowledge units. Not a Topic, Subject, Target, Exam, or Journey.';

comment on table public.question_versions is
  'Versioned editorial occurrence of a Question. Published rows are immutable. No historical backfill.';

revoke all on function public.prevent_published_question_version_mutation()
  from public, anon, authenticated;

revoke all on function public.prevent_published_question_version_mapping_mutation()
  from public, anon, authenticated;

comment on table public.question_version_knowledge_units is
  'N:N mobilisation of KnowledgeUnits by a QuestionVersion. role is not causal weight.';
