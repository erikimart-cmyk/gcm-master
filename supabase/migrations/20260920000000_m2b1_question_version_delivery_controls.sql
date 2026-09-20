-- ZYNVO M2B.1: operational Delivery Control for QuestionVersion.
-- Additive only. Editorial QuestionVersion remains immutable when published.
-- Delivery eligibility is not stored on question_versions.
-- Does not cut over delivery RPCs, frontend, LearningEvent, or Evidence.
-- Does not auto-APPROVE / auto-PUBLISH / auto-AVAILABLE the pilot.

create table public.question_version_delivery_controls (
  question_version_id uuid primary key
    references public.question_versions (id) on delete restrict,
  delivery_state text not null,
  reason text,
  provenance text not null,
  changed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_version_delivery_controls_state_check
    check (
      delivery_state in (
        'AVAILABLE',
        'RETIRED',
        'HOLD',
        'INVALIDATED'
      )
    ),
  constraint question_version_delivery_controls_reason_length
    check (
      reason is null
      or char_length(trim(reason)) between 1 and 1000
    ),
  constraint question_version_delivery_controls_hold_requires_reason
    check (
      delivery_state <> 'HOLD'
      or (
        reason is not null
        and char_length(trim(reason)) between 1 and 1000
      )
    ),
  constraint question_version_delivery_controls_invalidated_requires_reason
    check (
      delivery_state <> 'INVALIDATED'
      or (
        reason is not null
        and char_length(trim(reason)) between 1 and 1000
      )
    ),
  constraint question_version_delivery_controls_provenance_length
    check (char_length(trim(provenance)) between 1 and 120),
  constraint question_version_delivery_controls_changed_by_length
    check (
      changed_by is null
      or char_length(trim(changed_by)) between 1 and 120
    )
);

create index question_version_delivery_controls_state_idx
  on public.question_version_delivery_controls (delivery_state);

create trigger question_version_delivery_controls_set_updated_at
before update on public.question_version_delivery_controls
for each row
execute function public.set_updated_at();

alter table public.question_version_delivery_controls enable row level security;

revoke all on table public.question_version_delivery_controls
  from anon, authenticated, public;

comment on table public.question_version_delivery_controls is
  'Current operational eligibility of a QuestionVersion. Not editorial state. Not a Study Experience bus.';

comment on column public.question_version_delivery_controls.delivery_state is
  'AVAILABLE / RETIRED / HOLD / INVALIDATED. Missing row means fail-closed (not deliverable).';

comment on column public.question_version_delivery_controls.reason is
  'Required for HOLD and INVALIDATED. Optional for AVAILABLE and RETIRED.';

comment on column public.question_version_delivery_controls.provenance is
  'System or process that last wrote this operational row. Not a student identity.';

-- Structural import of pilot DB questions 1001–1012 as QuestionVersion v1 DRAFT.
-- Not approved, not published, not AVAILABLE. No KU mapping. No historical backfill.
-- Idempotent: will not create v2 or overwrite an existing v1 or DeliveryControl.

create function public.bootstrap_m2b1_pilot_question_version_foundation()
returns table (
  question_id integer,
  question_version_id uuid,
  action text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  v_qv_id uuid;
  v_action text;
  v_ids text[];
  v_alt jsonb;
begin
  for rec in
    select
      q.id,
      q.statement,
      q.alternatives,
      q.correct_answer,
      q.explanation,
      q.difficulty,
      q.source_label,
      q.source_version
    from public.questions q
    where q.id between 1001 and 1012
    order by q.id
  loop
    v_action := 'skipped_invalid';
    v_qv_id := null;

    if rec.statement is null
       or char_length(trim(rec.statement)) not between 1 and 8000
       or rec.explanation is null
       or char_length(trim(rec.explanation)) not between 1 and 8000
       or rec.correct_answer is null
       or char_length(trim(rec.correct_answer)) not between 1 and 8
       or rec.difficulty not in ('easy', 'medium', 'hard')
       or jsonb_typeof(rec.alternatives) is distinct from 'array'
       or jsonb_array_length(rec.alternatives) < 2
    then
      question_id := rec.id;
      question_version_id := null;
      action := v_action;
      return next;
      continue;
    end if;

    v_ids := array[]::text[];
    for v_alt in select jsonb_array_elements(rec.alternatives)
    loop
      if v_alt ? 'id' and jsonb_typeof(v_alt -> 'id') = 'string' then
        v_ids := v_ids || (v_alt ->> 'id');
      end if;
    end loop;

    if not (
      'A' = any (v_ids)
      and 'B' = any (v_ids)
      and 'C' = any (v_ids)
      and 'D' = any (v_ids)
      and rec.correct_answer = any (v_ids)
    ) then
      question_id := rec.id;
      question_version_id := null;
      action := v_action;
      return next;
      continue;
    end if;

    select qv.id
      into v_qv_id
      from public.question_versions qv
     where qv.question_id = rec.id
       and qv.version_number = 1;

    if v_qv_id is null then
      insert into public.question_versions (
        question_id,
        version_number,
        statement,
        alternatives,
        correct_answer,
        explanation,
        difficulty,
        source_type,
        source_label,
        source_version,
        validation_status,
        published_at
      ) values (
        rec.id,
        1,
        rec.statement,
        rec.alternatives,
        rec.correct_answer,
        rec.explanation,
        rec.difficulty,
        'zynvo_original',
        rec.source_label,
        rec.source_version,
        'draft',
        null
      )
      returning id into v_qv_id;
      v_action := 'inserted_qv_v1_draft';
    else
      v_action := 'qv_v1_already_present';
    end if;

    insert into public.question_version_delivery_controls (
      question_version_id,
      delivery_state,
      reason,
      provenance,
      changed_by
    ) values (
      v_qv_id,
      'HOLD',
      'Pilot QuestionVersion v1 is a structural import awaiting editorial approval. Not available for delivery.',
      'm2b1_pilot_bootstrap',
      'system'
    )
    on conflict on constraint question_version_delivery_controls_pkey do nothing;

    question_id := rec.id;
    question_version_id := v_qv_id;
    action := v_action;
    return next;
  end loop;
end;
$$;

revoke all on function public.bootstrap_m2b1_pilot_question_version_foundation()
  from public, anon, authenticated;

comment on function public.bootstrap_m2b1_pilot_question_version_foundation() is
  'One-shot migration helper. Idempotent structural import of DB 1001–1012 as draft QuestionVersion v1 + HOLD. Dropped after execution; not a runtime API.';

select public.bootstrap_m2b1_pilot_question_version_foundation();

drop function public.bootstrap_m2b1_pilot_question_version_foundation();
