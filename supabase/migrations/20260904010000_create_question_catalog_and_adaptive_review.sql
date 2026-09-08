-- ZYNVO pilot: GCM / VUNESP -> Matemática -> Porcentagem.
-- Catalog content is versioned and original to ZYNVO. It is intentionally
-- separate from user-owned attempts and assignments.

create table public.exams (
  id text primary key,
  name text not null,
  organizing_body text not null,
  position_name text,
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table public.subjects (
  id text primary key,
  exam_id text not null references public.exams (id) on delete cascade,
  name text not null,
  display_order integer not null default 0 check (display_order >= 0),
  unique (exam_id, name)
);

create table public.topics (
  id text primary key,
  subject_id text not null references public.subjects (id) on delete cascade,
  name text not null,
  learning_objective text not null,
  display_order integer not null default 0 check (display_order >= 0),
  unique (subject_id, name)
);

create table public.questions (
  id integer primary key check (id > 0),
  exam_id text not null references public.exams (id) on delete restrict,
  subject_id text not null references public.subjects (id) on delete restrict,
  topic_id text not null references public.topics (id) on delete restrict,
  country text not null default 'BR',
  language text not null default 'pt-BR',
  bank_id text not null,
  exam_name text not null,
  position_name text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  statement text not null,
  alternatives jsonb not null,
  correct_answer text not null,
  explanation text not null,
  source_label text not null,
  source_version text not null,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_alternatives_array check (jsonb_typeof(alternatives) = 'array')
);

create trigger questions_set_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

create table public.question_assignments (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id integer not null references public.questions (id) on delete restrict,
  delivery_context text not null default 'study'
    check (delivery_context in ('study', 'review')),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  answered_at timestamptz,
  primary key (user_id, question_id)
);

create index question_assignments_user_assigned_at_idx
  on public.question_assignments (user_id, assigned_at desc);

create index questions_selection_idx
  on public.questions (exam_id, status, last_assigned_at);

create table public.review_contents (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references public.topics (id) on delete cascade,
  title text not null,
  learning_objective text not null,
  explanation text not null,
  worked_example text not null,
  common_mistake text,
  source_label text not null,
  source_version text not null,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger review_contents_set_updated_at
before update on public.review_contents
for each row
execute function public.set_updated_at();

create table public.user_content_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  review_content_id uuid not null references public.review_contents (id) on delete cascade,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, review_content_id)
);

alter table public.question_attempts
  add column topic text;

alter table public.questions enable row level security;
alter table public.question_assignments enable row level security;
alter table public.review_contents enable row level security;
alter table public.user_content_progress enable row level security;

revoke all on table public.questions from anon, authenticated;
revoke all on table public.question_assignments from anon;
revoke all on table public.review_contents from anon;
revoke all on table public.user_content_progress from anon;

grant select on table public.question_assignments to authenticated;
grant select on table public.review_contents to authenticated;
grant select, insert, update on table public.user_content_progress to authenticated;

create policy "Students can read their question assignments"
on public.question_assignments
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Students can read published review content"
on public.review_contents
for select to authenticated
using (status = 'published');

create policy "Students can read their content progress"
on public.user_content_progress
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Students can start their content progress"
on public.user_content_progress
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Students can update their content progress"
on public.user_content_progress
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Delivery is server-owned. It locks candidate rows during selection, excludes
-- prior assignments for the requesting student and prefers globally less
-- recently assigned questions while alternatives exist.
create function public.assign_next_questions(
  p_exam_id text,
  p_limit integer default 5
)
returns table (
  id integer,
  country text,
  language text,
  bank_id text,
  exam_name text,
  position_name text,
  subject text,
  topic text,
  difficulty text,
  statement text,
  alternatives jsonb,
  correct_answer text,
  explanation text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required to assign questions';
  end if;

  if p_limit < 1 or p_limit > 10 then
    raise exception 'Question assignment limit must be between 1 and 10';
  end if;

  return query
  with candidates as (
    select q.id
    from public.questions q
    where q.exam_id = p_exam_id
      and q.status = 'published'
      and not exists (
        select 1
        from public.question_assignments qa
        where qa.user_id = v_user_id
          and qa.question_id = q.id
      )
    order by q.last_assigned_at asc nulls first, random()
    limit p_limit
    for update skip locked
  ), assignments as (
    insert into public.question_assignments (user_id, question_id)
    select v_user_id, c.id
    from candidates c
    on conflict do nothing
    returning question_id
  ), touched_questions as (
    update public.questions q
    set last_assigned_at = now()
    from assignments a
    where q.id = a.question_id
    returning q.id
  )
  select
    q.id,
    q.country,
    q.language,
    q.bank_id,
    q.exam_name,
    q.position_name,
    s.name,
    t.name,
    q.difficulty,
    q.statement,
    q.alternatives,
    q.correct_answer,
    q.explanation
  from public.questions q
  join touched_questions tq on tq.id = q.id
  join public.subjects s on s.id = q.subject_id
  join public.topics t on t.id = q.topic_id
  order by q.last_assigned_at, q.id;
end;
$$;

revoke all on function public.assign_next_questions(text, integer) from public, anon;
grant execute on function public.assign_next_questions(text, integer) to authenticated;

insert into public.exams (id, name, organizing_body, position_name, status)
values ('gcm-vunesp-pilot', 'GCM', 'VUNESP', 'Guarda Civil Municipal', 'published');

insert into public.subjects (id, exam_id, name, display_order)
values ('gcm-vunesp-matematica', 'gcm-vunesp-pilot', 'Matemática', 1);

insert into public.topics (id, subject_id, name, learning_objective, display_order)
values (
  'gcm-vunesp-matematica-porcentagem',
  'gcm-vunesp-matematica',
  'Porcentagem',
  'Calcular percentuais, aumentos, descontos e relações proporcionais em situações de prova.',
  1
);

insert into public.review_contents (
  topic_id, title, learning_objective, explanation, worked_example,
  common_mistake, source_label, source_version, status
)
values (
  'gcm-vunesp-matematica-porcentagem',
  'Porcentagem: do conceito à aplicação',
  'Relacionar uma parte ao todo e calcular aumentos ou descontos percentuais.',
  'Porcentagem significa “por cem”. Para calcular p% de um valor, transforme p em fração sobre 100 e multiplique pelo valor: p% de V = (p / 100) × V. Em aumentos, multiplique pelo fator 1 + p/100; em descontos, pelo fator 1 - p/100.',
  'Exemplo: 15% de 240 = (15 / 100) × 240 = 36. Se um produto de R$ 240 recebe 15% de desconto, o novo preço é 240 - 36 = R$ 204.',
  'Somar percentuais sucessivos diretamente. Um desconto de 10% seguido de outro de 20% não equivale a 30%: aplique cada percentual sobre o valor atualizado.',
  'ZYNVO Original Pilot', '2026.09.04', 'published'
);

insert into public.questions (
  id, exam_id, subject_id, topic_id, bank_id, exam_name, position_name,
  difficulty, statement, alternatives, correct_answer, explanation,
  source_label, source_version, status
)
values
  (1001, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'easy', 'Quanto é 10% de 350?', '[{"id":"A","text":"25"},{"id":"B","text":"30"},{"id":"C","text":"35"},{"id":"D","text":"40"}]', 'C', '10% corresponde a 10/100. Portanto, 350 × 0,10 = 35.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1002, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'easy', 'Um produto custa R$ 80 e recebe desconto de 15%. Qual é o preço final?', '[{"id":"A","text":"R$ 65"},{"id":"B","text":"R$ 68"},{"id":"C","text":"R$ 70"},{"id":"D","text":"R$ 72"}]', 'B', '15% de 80 é 12. Assim, 80 - 12 = 68.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1003, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'medium', 'Uma taxa de R$ 250 sofreu aumento de 8%. Qual é o novo valor?', '[{"id":"A","text":"R$ 258"},{"id":"B","text":"R$ 260"},{"id":"C","text":"R$ 268"},{"id":"D","text":"R$ 270"}]', 'D', '8% de 250 é 20. O novo valor é 250 + 20 = 270.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1004, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'medium', 'Se 30% de uma quantidade correspondem a 45, qual é a quantidade total?', '[{"id":"A","text":"135"},{"id":"B","text":"150"},{"id":"C","text":"165"},{"id":"D","text":"180"}]', 'B', 'Se 30% é 45, então 100% é 45 ÷ 0,30 = 150.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1005, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'medium', 'Um valor passou de 40 para 50. Qual foi o aumento percentual?', '[{"id":"A","text":"20%"},{"id":"B","text":"22,5%"},{"id":"C","text":"25%"},{"id":"D","text":"30%"}]', 'C', 'O aumento foi 10 sobre o valor inicial 40: 10 ÷ 40 = 0,25 = 25%.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1006, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'medium', 'Um item de R$ 100 recebe dois descontos sucessivos: primeiro 10% e depois 20%. Qual é o preço final?', '[{"id":"A","text":"R$ 70"},{"id":"B","text":"R$ 72"},{"id":"C","text":"R$ 75"},{"id":"D","text":"R$ 80"}]', 'B', 'Após 10%, o valor é 90. Aplicando 20% de desconto sobre 90, chega-se a 72.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1007, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'easy', 'Em uma turma com 40 alunos, 25% faltaram. Quantos alunos faltaram?', '[{"id":"A","text":"8"},{"id":"B","text":"10"},{"id":"C","text":"12"},{"id":"D","text":"15"}]', 'B', '25% equivale a um quarto. Um quarto de 40 é 10.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1008, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'medium', 'Uma prova tem 50 questões e uma candidata acertou 70%. Quantas questões ela acertou?', '[{"id":"A","text":"30"},{"id":"B","text":"32"},{"id":"C","text":"35"},{"id":"D","text":"40"}]', 'C', '70% de 50 é 0,70 × 50 = 35.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1009, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'hard', 'Uma média é formada por 70% de uma nota 50 e 30% de uma nota 80. Qual é a média ponderada?', '[{"id":"A","text":"56"},{"id":"B","text":"59"},{"id":"C","text":"62"},{"id":"D","text":"65"}]', 'B', '0,70 × 50 = 35 e 0,30 × 80 = 24. A soma é 59.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1010, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'hard', 'Se 20% de um número é 36, qual é esse número?', '[{"id":"A","text":"144"},{"id":"B","text":"160"},{"id":"C","text":"180"},{"id":"D","text":"200"}]', 'C', '20% é 0,20. Logo, 36 ÷ 0,20 = 180.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1011, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'hard', 'Após um desconto de 25%, um produto passou a custar R$ 150. Qual era o preço original?', '[{"id":"A","text":"R$ 180"},{"id":"B","text":"R$ 190"},{"id":"C","text":"R$ 200"},{"id":"D","text":"R$ 225"}]', 'C', 'Após desconto de 25%, restam 75% do preço. Então 150 ÷ 0,75 = 200.', 'ZYNVO Original Pilot', '2026.09.04', 'published'),
  (1012, 'gcm-vunesp-pilot', 'gcm-vunesp-matematica', 'gcm-vunesp-matematica-porcentagem', 'zynvo', 'GCM', 'Guarda Civil Municipal', 'easy', 'Em uma pesquisa com 120 pessoas, 60% escolheram a opção A. Quantas pessoas escolheram essa opção?', '[{"id":"A","text":"60"},{"id":"B","text":"66"},{"id":"C","text":"72"},{"id":"D","text":"80"}]', 'C', '60% de 120 é 0,60 × 120 = 72.', 'ZYNVO Original Pilot', '2026.09.04', 'published');

comment on table public.question_assignments is
  'Server-owned delivery log. One free-study question assignment per user prevents fake novelty.';

comment on table public.review_contents is
  'Editorially versioned learning content. Reading is not treated as proof of mastery.';
