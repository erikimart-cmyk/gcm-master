-- ZYNVO M2B.2: server-owned Secure Question Delivery foundation.
-- Does not cut over QuestionsPage or legacy assign_next_questions.
-- Does not confirm presentation, grade answers, or produce Evidence.
-- Does not promote real pilot QVs 1001–1012.
-- Review context is fail-closed until a secure review contract exists.

create function public.m2b2_question_version_passes_integrity(
  p_qv_id uuid,
  p_exam_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_question_id integer;
  v_exam_id text;
  v_q_status text;
  v_statement text;
  v_alts jsonb;
  v_correct text;
  v_validation text;
  v_published timestamptz;
  v_source_type text;
  v_source_label text;
  v_source_version text;
  v_dc text;
  v_elem jsonb;
  v_keys text[];
  v_ids text[] := array[]::text[];
  v_id text;
  v_primary integer;
  v_bad_ku integer;
begin
  if p_qv_id is null or p_exam_id is null or char_length(trim(p_exam_id)) = 0 then
    return false;
  end if;

  select
    qv.question_id,
    q.exam_id,
    q.status,
    qv.statement,
    qv.alternatives,
    qv.correct_answer,
    qv.validation_status,
    qv.published_at,
    qv.source_type,
    qv.source_label,
    qv.source_version
    into
      v_question_id,
      v_exam_id,
      v_q_status,
      v_statement,
      v_alts,
      v_correct,
      v_validation,
      v_published,
      v_source_type,
      v_source_label,
      v_source_version
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
   where qv.id = p_qv_id;

  if v_question_id is null then
    return false;
  end if;

  if v_exam_id is distinct from p_exam_id then
    return false;
  end if;

  if v_q_status is distinct from 'published' then
    return false;
  end if;

  if v_validation is distinct from 'approved' or v_published is null then
    return false;
  end if;

  if v_statement is null
     or char_length(trim(v_statement)) not between 1 and 8000 then
    return false;
  end if;

  if v_source_type not in (
       'zynvo_original', 'official', 'licensed', 'specialist', 'ai_assisted', 'imported'
     )
     or v_source_label is null
     or char_length(trim(v_source_label)) not between 1 and 160
     or v_source_version is null
     or char_length(trim(v_source_version)) not between 1 and 64
  then
    return false;
  end if;

  select dc.delivery_state
    into v_dc
    from public.question_version_delivery_controls dc
   where dc.question_version_id = p_qv_id;

  if v_dc is distinct from 'AVAILABLE' then
    return false;
  end if;

  if jsonb_typeof(v_alts) is distinct from 'array'
     or jsonb_array_length(v_alts) < 2 then
    return false;
  end if;

  if v_correct is null or char_length(trim(v_correct)) not between 1 and 8 then
    return false;
  end if;

  for v_elem in select jsonb_array_elements(v_alts)
  loop
    if jsonb_typeof(v_elem) is distinct from 'object' then
      return false;
    end if;

    select array_agg(k order by k)
      into v_keys
      from jsonb_object_keys(v_elem) as k;

    if v_keys is distinct from array['id', 'text']::text[] then
      return false;
    end if;

    if jsonb_typeof(v_elem -> 'id') is distinct from 'string'
       or jsonb_typeof(v_elem -> 'text') is distinct from 'string' then
      return false;
    end if;

    v_id := trim(v_elem ->> 'id');
    if v_id is null
       or char_length(v_id) not between 1 and 8
       or char_length(trim(v_elem ->> 'text')) not between 1 and 2000 then
      return false;
    end if;

    if v_id = any (v_ids) then
      return false;
    end if;

    v_ids := v_ids || v_id;
  end loop;

  if not (v_correct = any (v_ids)) then
    return false;
  end if;

  select count(*) into v_primary
    from public.question_version_knowledge_units qvku
   where qvku.question_version_id = p_qv_id
     and qvku.role = 'primary';

  if v_primary < 1 then
    return false;
  end if;

  select count(*) into v_bad_ku
    from public.question_version_knowledge_units qvku
    left join public.knowledge_units ku on ku.id = qvku.knowledge_unit_id
   where qvku.question_version_id = p_qv_id
     and qvku.role = 'primary'
     and (ku.id is null or ku.status is distinct from 'published');

  if v_bad_ku <> 0 then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.m2b2_question_version_passes_integrity(uuid, text)
  from public, anon, authenticated;

create function public.m2b2_safe_alternative_projection(p_alternatives jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_elem jsonb;
  v_out jsonb := '[]'::jsonb;
  v_keys text[];
  v_id text;
  v_ids text[] := array[]::text[];
begin
  if jsonb_typeof(p_alternatives) is distinct from 'array'
     or jsonb_array_length(p_alternatives) < 2 then
    return null;
  end if;

  for v_elem in select jsonb_array_elements(p_alternatives)
  loop
    if jsonb_typeof(v_elem) is distinct from 'object' then
      return null;
    end if;
    select array_agg(k order by k)
      into v_keys
      from jsonb_object_keys(v_elem) as k;
    if v_keys is distinct from array['id', 'text']::text[] then
      return null;
    end if;
    if jsonb_typeof(v_elem -> 'id') is distinct from 'string'
       or jsonb_typeof(v_elem -> 'text') is distinct from 'string' then
      return null;
    end if;
    v_id := trim(v_elem ->> 'id');
    if v_id is null or char_length(v_id) not between 1 and 8 then
      return null;
    end if;
    if v_id = any (v_ids) then
      return null;
    end if;
    v_ids := v_ids || v_id;
    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'id', v_id,
        'text', v_elem ->> 'text'
      )
    );
  end loop;

  return v_out;
end;
$$;

revoke all on function public.m2b2_safe_alternative_projection(jsonb)
  from public, anon, authenticated;

create function public.request_question_delivery(
  p_delivery_context text default 'study'
)
returns table (
  outcome text,
  assignment_id uuid,
  question_version_id uuid,
  question_id integer,
  statement text,
  alternatives jsonb,
  difficulty text,
  subject_label text,
  topic_label text,
  presentation_context text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_exam_id text;
  v_assignment_id uuid;
  v_qv_id uuid;
  v_question_id integer;
  v_inserted integer;
  v_answered_at timestamptz;
  v_ctx text;
  rec record;
  v_statement text;
  v_difficulty text;
  v_alts jsonb;
  v_subject text;
  v_topic text;
begin
  if v_user_id is null then
    outcome := 'DENIED';
    return next;
    return;
  end if;

  if p_delivery_context is distinct from 'study' then
    -- Secure review delivery is not implemented in M2B.2.
    outcome := 'UNAVAILABLE';
    return next;
    return;
  end if;

  select ust.exam_id
    into v_exam_id
    from public.user_study_tracks ust
    join public.exams e on e.id = ust.exam_id
   where ust.user_id = v_user_id
     and e.status = 'published';

  if v_exam_id is null then
    outcome := 'CONTEXT_NOT_READY';
    return next;
    return;
  end if;

  select qa.id, qa.question_version_id, qa.question_id
    into v_assignment_id, v_qv_id, v_question_id
    from public.question_assignments qa
   where qa.user_id = v_user_id
     and qa.answered_at is null
     and qa.question_version_id is not null
     and qa.delivery_context = 'study'
   order by qa.assigned_at asc, qa.id asc
   limit 1
   for update;

  if v_assignment_id is not null then
    if not public.m2b2_question_version_passes_integrity(v_qv_id, v_exam_id) then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    select
      qv.statement,
      qv.difficulty,
      public.m2b2_safe_alternative_projection(qv.alternatives),
      s.name,
      t.name
      into v_statement, v_difficulty, v_alts, v_subject, v_topic
      from public.question_versions qv
      join public.questions q on q.id = qv.question_id
      join public.subjects s on s.id = q.subject_id
      join public.topics t on t.id = q.topic_id
     where qv.id = v_qv_id
       and qv.question_id = v_question_id;

    if v_alts is null then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    outcome := 'DELIVERED';
    assignment_id := v_assignment_id;
    question_version_id := v_qv_id;
    question_id := v_question_id;
    statement := v_statement;
    alternatives := v_alts;
    difficulty := v_difficulty;
    subject_label := v_subject;
    topic_label := v_topic;
    presentation_context := 'study';
    return next;
    return;
  end if;

  for rec in
    select qv.id as qv_id, qv.question_id as q_id
      from public.question_versions qv
      join public.questions q on q.id = qv.question_id
      join public.question_version_delivery_controls dc
        on dc.question_version_id = qv.id
     where q.exam_id = v_exam_id
       and q.status = 'published'
       and qv.validation_status = 'approved'
       and qv.published_at is not null
       and dc.delivery_state = 'AVAILABLE'
       and not exists (
         select 1
         from public.question_assignments qa
         where qa.user_id = v_user_id
           and qa.question_id = q.id
       )
     order by qv.question_id, qv.version_number, qv.id
     for update of dc skip locked
  loop
    if not public.m2b2_question_version_passes_integrity(rec.qv_id, v_exam_id) then
      continue;
    end if;

    v_assignment_id := null;
    insert into public.question_assignments (
      user_id,
      question_id,
      delivery_context,
      question_version_id
    ) values (
      v_user_id,
      rec.q_id,
      'study',
      rec.qv_id
    )
    on conflict (user_id, question_id) do nothing
    returning id into v_assignment_id;

    get diagnostics v_inserted = row_count;

    if v_inserted = 0 then
      select qa.id, qa.question_version_id, qa.question_id, qa.answered_at, qa.delivery_context
        into v_assignment_id, v_qv_id, v_question_id, v_answered_at, v_ctx
        from public.question_assignments qa
       where qa.user_id = v_user_id
         and qa.question_id = rec.q_id
       for update;

      if v_qv_id is null
         or v_answered_at is not null
         or v_ctx is distinct from 'study'
         or not public.m2b2_question_version_passes_integrity(v_qv_id, v_exam_id)
      then
        continue;
      end if;
    else
      v_qv_id := rec.qv_id;
      v_question_id := rec.q_id;
    end if;

    select
      qv.statement,
      qv.difficulty,
      public.m2b2_safe_alternative_projection(qv.alternatives),
      s.name,
      t.name
      into v_statement, v_difficulty, v_alts, v_subject, v_topic
      from public.question_versions qv
      join public.questions q on q.id = qv.question_id
      join public.subjects s on s.id = q.subject_id
      join public.topics t on t.id = q.topic_id
     where qv.id = v_qv_id;

    if v_alts is null then
      outcome := 'UNAVAILABLE';
      return next;
      return;
    end if;

    outcome := 'DELIVERED';
    assignment_id := v_assignment_id;
    question_version_id := v_qv_id;
    question_id := v_question_id;
    statement := v_statement;
    alternatives := v_alts;
    difficulty := v_difficulty;
    subject_label := v_subject;
    topic_label := v_topic;
    presentation_context := 'study';
    return next;
    return;
  end loop;

  outcome := 'UNAVAILABLE';
  return next;
end;
$$;

revoke all on function public.request_question_delivery(text)
  from public, anon;

grant execute on function public.request_question_delivery(text)
  to authenticated;

comment on function public.request_question_delivery(text) is
  'M2B.2 server-owned Question Delivery. StudyTrack authority. No gabarito. Not a StudyExperience bus. Review context is fail-closed.';

comment on function public.m2b2_question_version_passes_integrity(uuid, text) is
  'Internal Pre-Delivery Integrity Check. Not a client API.';
