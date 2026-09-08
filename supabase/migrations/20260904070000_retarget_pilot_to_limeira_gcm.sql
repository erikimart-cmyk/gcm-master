-- Retarget the original ZYNVO pilot to the approved public-trail reference.
-- Existing questions remain ZYNVO-authored and editorially versioned; the
-- public notice informs the scope, not the wording or answer choices.
update public.exams
set
  name = 'Prefeitura de Limeira — Concurso Público 02/2026',
  organizing_body = 'AVANÇASP',
  position_name = 'Guarda Civil Municipal – 3ª Classe'
where id = 'gcm-vunesp-pilot';

update public.subjects
set name = 'Matemática e Raciocínio Lógico'
where id = 'gcm-vunesp-matematica';

update public.topics
set
  name = 'Porcentagem e proporcionalidade',
  learning_objective = 'Resolver situações de porcentagem, aumentos, descontos e proporcionalidade em questões objetivas.'
where id = 'gcm-vunesp-matematica-porcentagem';

update public.questions
set
  bank_id = 'avancasp',
  exam_name = 'Prefeitura de Limeira — Concurso Público 02/2026',
  position_name = 'Guarda Civil Municipal – 3ª Classe',
  source_label = 'ZYNVO Original · Referência: Edital Limeira 02/2026',
  source_version = '2026.09.04-limeira-gcm'
where exam_id = 'gcm-vunesp-pilot';

-- This is the approved study matrix for the GCM pilot. Only the mathematics
-- topic above has published ZYNVO-authored questions in this delivery.
insert into public.subjects (id, exam_id, name, display_order)
values
  ('gcm-vunesp-portugues', 'gcm-vunesp-pilot', 'Língua Portuguesa', 0),
  ('gcm-vunesp-informatica', 'gcm-vunesp-pilot', 'Noções de Informática', 2),
  ('gcm-vunesp-especificos', 'gcm-vunesp-pilot', 'Conhecimentos Específicos', 3)
on conflict (id) do update
set name = excluded.name,
    display_order = excluded.display_order;

insert into public.topics (id, subject_id, name, learning_objective, display_order)
values
  (
    'gcm-vunesp-portugues-interpretacao',
    'gcm-vunesp-portugues',
    'Leitura e interpretação de textos',
    'Interpretar textos literários e não literários com atenção ao sentido e à informação explícita ou implícita.',
    0
  ),
  (
    'gcm-vunesp-informatica-fundamentos',
    'gcm-vunesp-informatica',
    'Ferramentas e internet',
    'Aplicar noções de sistemas operacionais, ferramentas de escritório, correio eletrônico e navegação na internet.',
    0
  ),
  (
    'gcm-vunesp-especificos-atuacao',
    'gcm-vunesp-especificos',
    'Atuação e legislação da Guarda Civil Municipal',
    'Estudar a atuação profissional e a legislação prevista no conteúdo específico do cargo.',
    0
  )
on conflict (id) do update
set name = excluded.name,
    learning_objective = excluded.learning_objective,
    display_order = excluded.display_order;
