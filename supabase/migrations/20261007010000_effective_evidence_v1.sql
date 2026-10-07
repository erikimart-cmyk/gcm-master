-- ZYNVO effective-evidence-v1.
-- Read-only resolver and write guardrails for learning evidence actions.
-- Does not add question identity columns to learning_evidence.
-- Does not implement recommendation, delivery, or question selection.
-- Existing incompatible evidence_actions fail this migration.
-- Rows are not deleted, deduplicated, or rewritten.

do $$
begin
  if exists (
    select 1
    from public.evidence_actions
    group by evidence_id
    having count(*) > 1
  ) then
    raise exception
      'effective evidence v1 refuses existing evidence_actions with more than one row per source';
  end if;

  if exists (
    select 1
    from public.evidence_actions
    where replacement_evidence_id is not null
    group by replacement_evidence_id
    having count(*) > 1
  ) then
    raise exception
      'effective evidence v1 refuses existing evidence_actions with more than one predecessor';
  end if;

  if exists (
    with recursive reach as (
      select
        evidence_id as origin,
        replacement_evidence_id as node,
        array[evidence_id, replacement_evidence_id] as path,
        false as cycle
      from public.evidence_actions
      where action = 'supersede'
        and replacement_evidence_id is not null
        and replacement_evidence_id <> evidence_id
      union all
      select
        reach.origin,
        action_row.replacement_evidence_id,
        reach.path || action_row.replacement_evidence_id,
        action_row.replacement_evidence_id = any (reach.path)
      from reach
      join public.evidence_actions as action_row
        on action_row.evidence_id = reach.node
       and action_row.action = 'supersede'
       and action_row.replacement_evidence_id is not null
      where not reach.cycle
        and cardinality(reach.path) < 10000
    )
    select 1
    from reach
    where cycle
  ) then
    raise exception
      'effective evidence v1 refuses an existing supersede cycle';
  end if;
end;
$$;

create unique index evidence_actions_one_source_uidx
  on public.evidence_actions (evidence_id);

create unique index evidence_actions_one_predecessor_uidx
  on public.evidence_actions (replacement_evidence_id)
  where replacement_evidence_id is not null;

comment on index public.evidence_actions_one_source_uidx is
  'V1 allows one evidence_actions row per source. Identical historical duplicates are not rewritten here.';

comment on index public.evidence_actions_one_predecessor_uidx is
  'V1 allows one supersede predecessor per replacement. This is a linear chain, not a DAG.';

create function public.enforce_evidence_action_supersede_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cursor uuid;
  v_next uuid;
  v_guard integer := 0;
begin
  if new.action is distinct from 'supersede'
     or new.replacement_evidence_id is null
     or new.replacement_evidence_id = new.evidence_id then
    return new;
  end if;

  v_cursor := new.replacement_evidence_id;

  while v_cursor is not null loop
    if v_cursor = new.evidence_id then
      raise exception 'evidence_actions supersede would create a cycle'
        using errcode = '23514';
    end if;

    v_guard := v_guard + 1;
    if v_guard > 10000 then
      raise exception 'evidence_actions supersede chain is too long to validate'
        using errcode = '23514';
    end if;

    select action_row.replacement_evidence_id
      into v_next
      from public.evidence_actions as action_row
     where action_row.evidence_id = v_cursor
       and action_row.action = 'supersede'
       and action_row.replacement_evidence_id is not null
       and action_row.id is distinct from new.id;

    v_cursor := v_next;
  end loop;

  return new;
end;
$$;

create trigger evidence_actions_enforce_supersede_cycle
before insert or update on public.evidence_actions
for each row
execute function public.enforce_evidence_action_supersede_cycle();

create function public.effective_evidence_resolve_inputs(
  p_profile_id uuid,
  p_evidence jsonb,
  p_actions jsonb,
  p_attempts jsonb
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_evidence jsonb := '[]'::jsonb;
  v_components jsonb := '[]'::jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_root uuid;
  v_other uuid;
  v_small uuid;
  v_large uuid;
  v_total integer;
  v_good integer;
  v_status text;
  v_attempt_id uuid;
  v_question_id integer;
  v_question_version_id uuid;
  v_component record;
  v_node record;
begin
  if p_profile_id is null then
    raise exception 'effective evidence profile is required';
  end if;

  drop table if exists pg_temp.ee_node;
  drop table if exists pg_temp.ee_edge;
  drop table if exists pg_temp.ee_mark;
  drop table if exists pg_temp.ee_attempt;
  drop table if exists pg_temp.ee_action;
  drop table if exists pg_temp.ee_unresolved;

  create temporary table ee_node (
    id uuid primary key,
    learning_event_id uuid,
    knowledge_unit_id text,
    knowledge_unit_name text,
    stage text,
    observation text,
    strength text,
    assistance_context text,
    timing_interpretation text,
    producer_type text,
    producer_version text,
    observed_at timestamptz,
    generated_at timestamptz,
    invalidated boolean not null default false,
    component_root uuid not null,
    structural_status text,
    complete boolean not null
  );

  create temporary table ee_edge (
    source_id uuid not null,
    replacement_id uuid not null,
    primary key (source_id, replacement_id)
  );

  create temporary table ee_mark (
    evidence_id uuid not null,
    status text not null
  );

  create temporary table ee_attempt (
    id uuid not null,
    learning_event_id uuid not null,
    question_id integer,
    question_version_id uuid,
    user_id uuid
  );

  create temporary table ee_action (
    evidence_id uuid not null,
    action text,
    replacement_id uuid
  );

  create temporary table ee_unresolved (
    id uuid primary key
  );

  insert into pg_temp.ee_node (
    id,
    learning_event_id,
    knowledge_unit_id,
    knowledge_unit_name,
    stage,
    observation,
    strength,
    assistance_context,
    timing_interpretation,
    producer_type,
    producer_version,
    observed_at,
    generated_at,
    component_root,
    complete
  )
  select distinct on ((ev->>'id')::uuid)
    (ev->>'id')::uuid,
    (ev->>'learning_event_id')::uuid,
    ev->>'knowledge_unit_id',
    ev->>'knowledge_unit_name',
    ev->>'stage',
    ev->>'observation',
    ev->>'strength',
    ev->>'assistance_context',
    ev->>'timing_interpretation',
    ev->>'producer_type',
    ev->>'producer_version',
    case
      when ev->>'observed_at' is null then null
      else (ev->>'observed_at')::timestamptz
    end,
    case
      when ev->>'generated_at' is null then null
      else (ev->>'generated_at')::timestamptz
    end,
    (ev->>'id')::uuid,
    (
      ev->>'learning_event_id' is not null
      and coalesce(ev->>'knowledge_unit_id', '') <> ''
      and ev->>'stage' in ('exposure', 'comprehension', 'application', 'retention')
      and ev->>'observation' in ('observed', 'success', 'difficulty')
      and ev->>'strength' in ('weak', 'moderate', 'strong')
      and coalesce(ev->>'assistance_context', '') <> ''
      and coalesce(ev->>'timing_interpretation', '') <> ''
      and coalesce(ev->>'producer_type', '') <> ''
      and coalesce(ev->>'producer_version', '') <> ''
      and ev->>'observed_at' is not null
      and ev->>'generated_at' is not null
    )
  from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) as ev
  where ev->>'id' is not null
    and (ev->>'profile_id')::uuid = p_profile_id
  order by (ev->>'id')::uuid;

  insert into pg_temp.ee_mark (evidence_id, status)
  select id, 'SCHEMA_IMPOSSIBLE_STATE'
  from pg_temp.ee_node
  where not complete;

  insert into pg_temp.ee_attempt (
    id,
    learning_event_id,
    question_id,
    question_version_id,
    user_id
  )
  select
    (attempt_row->>'id')::uuid,
    (attempt_row->>'learning_event_id')::uuid,
    case
      when attempt_row->>'question_id' is null then null
      else (attempt_row->>'question_id')::integer
    end,
    case
      when attempt_row->>'question_version_id' is null then null
      else (attempt_row->>'question_version_id')::uuid
    end,
    case
      when attempt_row->>'user_id' is null then null
      else (attempt_row->>'user_id')::uuid
    end
  from jsonb_array_elements(coalesce(p_attempts, '[]'::jsonb)) as attempt_row
  where attempt_row->>'id' is not null
    and attempt_row->>'learning_event_id' is not null;

  insert into pg_temp.ee_action (evidence_id, action, replacement_id)
  select distinct
    (action_row->>'evidence_id')::uuid,
    action_row->>'action',
    case
      when action_row->>'replacement_evidence_id' is null then null
      else (action_row->>'replacement_evidence_id')::uuid
    end
  from jsonb_array_elements(coalesce(p_actions, '[]'::jsonb)) as action_row
  where action_row->>'evidence_id' is not null;

  insert into pg_temp.ee_mark (evidence_id, status)
  select action_row.evidence_id, 'SCHEMA_IMPOSSIBLE_STATE'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as node
    on node.id = action_row.evidence_id
  where action_row.action is distinct from 'invalidate'
    and action_row.action is distinct from 'supersede';

  insert into pg_temp.ee_mark (evidence_id, status)
  select action_row.evidence_id, 'SCHEMA_IMPOSSIBLE_STATE'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as node
    on node.id = action_row.evidence_id
  where action_row.action = 'invalidate'
    and action_row.replacement_id is not null;

  insert into pg_temp.ee_mark (evidence_id, status)
  select action_row.evidence_id, 'SCHEMA_IMPOSSIBLE_STATE'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as node
    on node.id = action_row.evidence_id
  where action_row.action = 'supersede'
    and (
      action_row.replacement_id is null
      or action_row.replacement_id = action_row.evidence_id
    );

  insert into pg_temp.ee_mark (evidence_id, status)
  select action_row.evidence_id, 'PROFILE_MISMATCH'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as node
    on node.id = action_row.evidence_id
  where action_row.action = 'supersede'
    and action_row.replacement_id is not null
    and action_row.replacement_id <> action_row.evidence_id
    and not exists (
      select 1
      from pg_temp.ee_node as replacement
      where replacement.id = action_row.replacement_id
    )
    and exists (
      select 1
      from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) as ev
      where (ev->>'id')::uuid = action_row.replacement_id
        and (ev->>'profile_id')::uuid is distinct from p_profile_id
    );

  insert into pg_temp.ee_mark (evidence_id, status)
  select action_row.evidence_id, 'SCHEMA_IMPOSSIBLE_STATE'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as node
    on node.id = action_row.evidence_id
  where action_row.action = 'supersede'
    and action_row.replacement_id is not null
    and action_row.replacement_id <> action_row.evidence_id
    and not exists (
      select 1
      from pg_temp.ee_node as replacement
      where replacement.id = action_row.replacement_id
    )
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) as ev
      where (ev->>'id')::uuid = action_row.replacement_id
        and (ev->>'profile_id')::uuid is distinct from p_profile_id
    );

  insert into pg_temp.ee_mark (evidence_id, status)
  select replacement.id, 'PROFILE_MISMATCH'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as replacement
    on replacement.id = action_row.replacement_id
  where action_row.action = 'supersede'
    and not exists (
      select 1
      from pg_temp.ee_node as source_node
      where source_node.id = action_row.evidence_id
    )
    and exists (
      select 1
      from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) as ev
      where (ev->>'id')::uuid = action_row.evidence_id
        and (ev->>'profile_id')::uuid is distinct from p_profile_id
    );

  insert into pg_temp.ee_mark (evidence_id, status)
  select replacement.id, 'SCHEMA_IMPOSSIBLE_STATE'
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as replacement
    on replacement.id = action_row.replacement_id
  where action_row.action = 'supersede'
    and not exists (
      select 1
      from pg_temp.ee_node as source_node
      where source_node.id = action_row.evidence_id
    )
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) as ev
      where (ev->>'id')::uuid = action_row.evidence_id
    );

  update pg_temp.ee_node as node
     set invalidated = true
   where node.complete
     and exists (
       select 1
       from pg_temp.ee_action as action_row
       where action_row.evidence_id = node.id
         and action_row.action = 'invalidate'
         and action_row.replacement_id is null
     );

  insert into pg_temp.ee_edge (source_id, replacement_id)
  select distinct action_row.evidence_id, action_row.replacement_id
  from pg_temp.ee_action as action_row
  join pg_temp.ee_node as source_node
    on source_node.id = action_row.evidence_id
   and source_node.complete
  join pg_temp.ee_node as replacement
    on replacement.id = action_row.replacement_id
  where action_row.action = 'supersede'
    and action_row.replacement_id is not null
    and action_row.replacement_id <> action_row.evidence_id;

  insert into pg_temp.ee_mark (evidence_id, status)
  select source_id, 'MULTIPLE_SUCCESSORS'
  from pg_temp.ee_edge
  group by source_id
  having count(*) > 1;

  insert into pg_temp.ee_mark (evidence_id, status)
  select replacement_id, 'MULTIPLE_PREDECESSORS'
  from pg_temp.ee_edge
  group by replacement_id
  having count(*) > 1;

  insert into pg_temp.ee_mark (evidence_id, status)
  select edge.source_id, 'MULTIPLE_PREDECESSORS'
  from pg_temp.ee_edge as edge
  where edge.replacement_id in (
    select replacement_id
    from pg_temp.ee_edge
    group by replacement_id
    having count(*) > 1
  );

  insert into pg_temp.ee_mark (evidence_id, status)
  select node.id, 'ACTION_CONFLICT'
  from pg_temp.ee_node as node
  where node.invalidated
    and exists (
      select 1
      from pg_temp.ee_edge as edge
      where edge.source_id = node.id
    );

  insert into pg_temp.ee_mark (evidence_id, status)
  select cycled.id, 'CYCLE'
  from (
    with recursive reach as (
      select
        edge.source_id as origin,
        edge.replacement_id as node,
        array[edge.source_id, edge.replacement_id] as path,
        edge.replacement_id = edge.source_id as cycle
      from pg_temp.ee_edge as edge
      union all
      select
        reach.origin,
        next_edge.replacement_id,
        reach.path || next_edge.replacement_id,
        next_edge.replacement_id = any (reach.path)
      from reach
      join pg_temp.ee_edge as next_edge
        on next_edge.source_id = reach.node
      where not reach.cycle
        and cardinality(reach.path) < 10000
    )
    select origin as id
    from reach
    where cycle
    union
    select node as id
    from reach
    where cycle
  ) as cycled;

  update pg_temp.ee_node as node
     set structural_status = picked.status
    from (
      select distinct on (mark.evidence_id)
        mark.evidence_id,
        mark.status
      from pg_temp.ee_mark as mark
      order by mark.evidence_id,
        case mark.status
          when 'SCHEMA_IMPOSSIBLE_STATE' then 1
          when 'PROFILE_MISMATCH' then 2
          when 'CYCLE' then 3
          when 'MULTIPLE_SUCCESSORS' then 4
          when 'MULTIPLE_PREDECESSORS' then 5
          when 'ACTION_CONFLICT' then 6
          else 100
        end
    ) as picked
   where node.id = picked.evidence_id;

  for v_node in
    select source_id, replacement_id
    from pg_temp.ee_edge
  loop
    v_root := v_node.source_id;
    loop
      select component_root
        into v_other
        from pg_temp.ee_node
       where id = v_root;
      exit when v_other = v_root;
      v_root := v_other;
    end loop;

    v_other := v_node.replacement_id;
    loop
      select component_root
        into v_large
        from pg_temp.ee_node
       where id = v_other;
      exit when v_large = v_other;
      v_other := v_large;
    end loop;

    if v_root <> v_other then
      if v_root < v_other then
        v_small := v_root;
        v_large := v_other;
      else
        v_small := v_other;
        v_large := v_root;
      end if;

      update pg_temp.ee_node
         set component_root = v_small
       where id = v_large;
    end if;
  end loop;

  loop
    update pg_temp.ee_node as child
       set component_root = parent.component_root
      from pg_temp.ee_node as parent
     where child.component_root = parent.id
       and parent.component_root is distinct from parent.id;
    exit when not found;
  end loop;

  update pg_temp.ee_node as node
     set structural_status = best.status
    from (
      select distinct on (component_root)
        component_root,
        structural_status as status
      from pg_temp.ee_node
      where structural_status is not null
      order by component_root,
        case structural_status
          when 'SCHEMA_IMPOSSIBLE_STATE' then 1
          when 'PROFILE_MISMATCH' then 2
          when 'CYCLE' then 3
          when 'MULTIPLE_SUCCESSORS' then 4
          when 'MULTIPLE_PREDECESSORS' then 5
          when 'ACTION_CONFLICT' then 6
          else 100
        end
    ) as best
   where node.component_root = best.component_root;

  insert into pg_temp.ee_unresolved (id)
  select id
  from pg_temp.ee_node
  where structural_status is not null
  on conflict (id) do nothing;

  for v_component in
    select
      structural_status as status,
      jsonb_agg(id order by id) as evidence_ids
    from pg_temp.ee_node
    where structural_status is not null
    group by component_root, structural_status
    order by min(id::text)
  loop
    v_components := v_components || jsonb_build_array(
      jsonb_build_object(
        'evidence_ids', v_component.evidence_ids,
        'status', v_component.status
      )
    );
  end loop;

  for v_node in
    select *
    from pg_temp.ee_node as node
    where node.structural_status is null
      and not node.invalidated
      and not exists (
        select 1
        from pg_temp.ee_edge as edge
        where edge.source_id = node.id
      )
    order by node.observed_at, node.generated_at, node.id
  loop
    select
      count(*),
      count(*) filter (
        where question_id is not null
          and question_version_id is not null
          and user_id = p_profile_id
      )
      into v_total, v_good
      from pg_temp.ee_attempt
     where learning_event_id = v_node.learning_event_id;

    v_status := null;
    if v_total = 0 then
      v_status := 'PROVENANCE_MISSING';
    elsif v_good = 1 and v_total = 1 then
      v_status := null;
    elsif v_good = 0 then
      v_status := 'PROVENANCE_MISSING';
      if exists (
        select 1
        from pg_temp.ee_attempt
        where learning_event_id = v_node.learning_event_id
          and question_id is not null
          and question_version_id is not null
          and user_id is distinct from p_profile_id
      ) then
        v_status := 'SCHEMA_IMPOSSIBLE_STATE';
      end if;
    else
      v_status := 'SCHEMA_IMPOSSIBLE_STATE';
    end if;

    if v_status is not null then
      insert into pg_temp.ee_unresolved (id)
      values (v_node.id)
      on conflict (id) do nothing;

      v_components := v_components || jsonb_build_array(
        jsonb_build_object(
          'evidence_ids', jsonb_build_array(v_node.id),
          'status', v_status
        )
      );
    else
      select id, question_id, question_version_id
        into v_attempt_id, v_question_id, v_question_version_id
        from pg_temp.ee_attempt
       where learning_event_id = v_node.learning_event_id
         and question_id is not null
         and question_version_id is not null
         and user_id = p_profile_id
       limit 1;

      v_evidence := v_evidence || jsonb_build_array(
        jsonb_build_object(
          'evidence_id', v_node.id,
          'learning_event_id', v_node.learning_event_id,
          'question_id', v_question_id,
          'question_version_id', v_question_version_id,
          'attempt_id', v_attempt_id,
          'knowledge_unit_id', v_node.knowledge_unit_id,
          'knowledge_unit_name', v_node.knowledge_unit_name,
          'stage', v_node.stage,
          'observation', v_node.observation,
          'observed_at', v_node.observed_at,
          'generated_at', v_node.generated_at,
          'strength', v_node.strength,
          'assistance_context', v_node.assistance_context,
          'timing_interpretation', v_node.timing_interpretation,
          'producer_type', v_node.producer_type,
          'producer_version', v_node.producer_version
        )
      );
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(id) order by id), '[]'::jsonb)
    into v_unresolved
    from pg_temp.ee_unresolved;

  drop table if exists pg_temp.ee_node;
  drop table if exists pg_temp.ee_edge;
  drop table if exists pg_temp.ee_mark;
  drop table if exists pg_temp.ee_action;
  drop table if exists pg_temp.ee_attempt;
  drop table if exists pg_temp.ee_unresolved;

  return jsonb_build_object(
    'resolver_version', 'effective-evidence-v1',
    'actions_applied', true,
    'integrity_status', case
      when jsonb_array_length(v_unresolved) = 0 then 'ok'
      else 'degraded'
    end,
    'unresolved_evidence_ids', v_unresolved,
    'components', v_components,
    'evidence', v_evidence
  );
exception
  when others then
    drop table if exists pg_temp.ee_node;
    drop table if exists pg_temp.ee_edge;
    drop table if exists pg_temp.ee_mark;
    drop table if exists pg_temp.ee_action;
    drop table if exists pg_temp.ee_attempt;
    drop table if exists pg_temp.ee_unresolved;
    raise;
end;
$$;

create function public.effective_evidence_resolve(p_profile_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_evidence jsonb;
  v_actions jsonb;
  v_attempts jsonb;
  v_foreign jsonb;
begin
  if p_profile_id is null then
    raise exception 'effective evidence profile is required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', evidence.id,
        'profile_id', evidence.profile_id,
        'learning_event_id', evidence.learning_event_id,
        'knowledge_unit_id', evidence.knowledge_unit_id,
        'knowledge_unit_name', knowledge_unit.name,
        'stage', evidence.stage,
        'observation', evidence.observation,
        'strength', evidence.strength,
        'assistance_context', evidence.assistance_context,
        'timing_interpretation', evidence.timing_interpretation,
        'producer_type', evidence.producer_type,
        'producer_version', evidence.producer_version,
        'observed_at', evidence.observed_at,
        'generated_at', evidence.generated_at
      )
    ),
    '[]'::jsonb
  )
    into v_evidence
    from public.learning_evidence as evidence
    join public.knowledge_units as knowledge_unit
      on knowledge_unit.id = evidence.knowledge_unit_id
   where evidence.profile_id = p_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', foreign_evidence.id,
        'profile_id', foreign_evidence.profile_id
      )
    ),
    '[]'::jsonb
  )
    into v_foreign
    from public.learning_evidence as foreign_evidence
   where foreign_evidence.profile_id <> p_profile_id
     and (
       foreign_evidence.id in (
         select action_row.replacement_evidence_id
         from public.evidence_actions as action_row
         where action_row.evidence_id in (
           select evidence.id
           from public.learning_evidence as evidence
           where evidence.profile_id = p_profile_id
         )
           and action_row.replacement_evidence_id is not null
       )
       or foreign_evidence.id in (
         select action_row.evidence_id
         from public.evidence_actions as action_row
         where action_row.replacement_evidence_id in (
           select evidence.id
           from public.learning_evidence as evidence
           where evidence.profile_id = p_profile_id
         )
       )
     );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'evidence_id', action_row.evidence_id,
        'action', action_row.action,
        'replacement_evidence_id', action_row.replacement_evidence_id
      )
    ),
    '[]'::jsonb
  )
    into v_actions
    from public.evidence_actions as action_row
   where action_row.evidence_id in (
       select evidence.id
       from public.learning_evidence as evidence
       where evidence.profile_id = p_profile_id
     )
      or action_row.replacement_evidence_id in (
       select evidence.id
       from public.learning_evidence as evidence
       where evidence.profile_id = p_profile_id
     );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', attempt.id,
        'learning_event_id', attempt.learning_event_id,
        'question_id', attempt.question_id,
        'question_version_id', attempt.question_version_id,
        'user_id', attempt.user_id
      )
    ),
    '[]'::jsonb
  )
    into v_attempts
    from public.question_attempts as attempt
   where attempt.learning_event_id in (
     select evidence.learning_event_id
     from public.learning_evidence as evidence
     where evidence.profile_id = p_profile_id
   );

  return public.effective_evidence_resolve_inputs(
    p_profile_id,
    v_evidence || v_foreign,
    v_actions,
    v_attempts
  );
end;
$$;

create function public.read_effective_learning_evidence()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required'
      using errcode = '28000';
  end if;

  return public.effective_evidence_resolve(v_user_id);
end;
$$;

revoke all on function public.enforce_evidence_action_supersede_cycle()
  from public, anon, authenticated;

revoke all on function public.effective_evidence_resolve_inputs(uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated;

revoke all on function public.effective_evidence_resolve(uuid)
  from public, anon, authenticated;

revoke all on function public.read_effective_learning_evidence()
  from public, anon;

grant execute on function public.read_effective_learning_evidence()
  to authenticated;

comment on function public.enforce_evidence_action_supersede_cycle() is
  'Rejects a supersede write that would close a directed cycle of length 2 or more.';

comment on function public.effective_evidence_resolve_inputs(uuid, jsonb, jsonb, jsonb) is
  'Private effective-evidence-v1 graph resolver. Not a client entry point.';

comment on function public.effective_evidence_resolve(uuid) is
  'Private profile-scoped loader for effective-evidence-v1. Not a client entry point.';

comment on function public.read_effective_learning_evidence() is
  'Read-only effective learning evidence for auth.uid(). Does not recommend, select a question, or expose evidence_actions.';
