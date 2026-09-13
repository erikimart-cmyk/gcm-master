# ZYNVO — Banco de Questões e Revisão Adaptativa: Especificação Técnica

**Status vigente:** **EM IMPLEMENTAÇÃO**. Fonte: `docs/PROJECT_STATUS_AND_GOVERNANCE.md`.

Partes relacionadas a esta arquitetura foram versionadas posteriormente na organização Git. Isso registra existência no repositório; **não** marca os critérios de aceite da seção 9, **não** declara RPC, Supabase ou UI validados nesta fase e **não** promove o bloco a `EM VALIDAÇÃO`, `IMPLEMENTADO` ou `RELEASE`.

**Leitura histórica em 04/09/2026 (não é o estado Git atual):** havia implementação substancial desta arquitetura no working tree canônico, ainda não validada como conjunto e ainda não commitada, sobre o baseline `353c061`. Naquela data isso significava:

- **implementado no working tree:** catálogo e atribuição de questões, seleção de questões inéditas, registro de tentativas atribuídas, carregamento de revisão, conteúdo de revisão, progresso de conteúdo, trilha de estudo e integração dos fluxos correspondentes em código e migrations locais;
- **ainda não validado naquela fase:** migrations não executadas então, testes existentes não executados naquela análise, e ainda faltavam suíte completa, lint, build, RLS/transações no ambiente integrado, navegação e revisão manual;
- **ainda não commitado naquela data:** alteração local sobre `353c061`.

A presença de arquivos, rotas ou telas não autoriza marcar os critérios de aceite como concluídos. O avanço para `IMPLEMENTADO` exige validação correspondente ao estado versionado; `RELEASE` exige ainda integração e disponibilização conforme `docs/PROJECT_STATUS_AND_GOVERNANCE.md`.

**Piloto aprovado:** Prefeitura de Limeira/SP — Concurso Público 02/2026, Guarda Civil Municipal – 3ª Classe, AVANÇASP → Matemática e Raciocínio Lógico → Porcentagem e proporcionalidade. As primeiras questões e conteúdos serão originais da ZYNVO, com identificação de versão e revisão editorial. A expansão para outras matérias e concursos será guiada por uma matriz de conteúdos de editais verificados; editais orientam tópicos cobrados, não autorizam a cópia de questões ou materiais protegidos.

**Referência editorial:** edital 02/2026 publicado pela Prefeitura de Limeira e página do certame da AVANÇASP. O quadro objetivo do cargo contém Língua Portuguesa, Matemática e Raciocínio Lógico, Noções de Informática e Conhecimentos Específicos. A matriz inicial registra as quatro frentes; nesta entrega, somente Matemática/Porcentagem possui questões e conteúdo ZYNVO publicados.

**Decisão de nomenclatura pendente:** o identificador técnico atual `gcm-vunesp-pilot` convive com a definição editorial do piloto como Prefeitura de Limeira/Guarda Civil Municipal – 3ª Classe/AVANÇASP. Essa divergência deve ser resolvida em decisão própria, considerando compatibilidade e rastreabilidade de dados. Nenhum identificador, arquivo ou referência será renomeado nesta fase documental.

## 1. Visão do produto

A ZYNVO deve conduzir cada aluno em um ciclo individual de aprendizagem:

```text
Objetivo / concurso
        ↓
Questões adequadas e ainda não vistas
        ↓
Tentativas e diagnóstico por disciplina/tópico
        ↓
Conteúdo de revisão explicativo
        ↓
Nova prática direcionada
        ↓
Evolução observável no Dashboard
```

O produto não é um catálogo de perguntas aleatórias. É uma experiência adaptativa que ajuda o aluno a identificar lacunas, estudar o conteúdo relacionado e voltar à prática com clareza.

## 2. Regra de distribuição entre alunos

### 2.1 Princípio correto

Cada aluno deve receber, prioritariamente, questões que **ele próprio nunca recebeu**. A ZYNVO também deve reduzir a probabilidade de dois alunos no mesmo concurso receberem a mesma questão no mesmo período, quando houver alternativas equivalentes.

Não é recomendável prometer que uma questão jamais será exibida a dois alunos em todo o sistema. Isso desperdiça um catálogo finito, torna o produto inviável conforme a base cresce e não melhora necessariamente a aprendizagem.

### 2.2 Política recomendada

1. Nunca repetir para o mesmo aluno uma questão marcada como entregue, exceto em revisão explícita.
2. Preferir questões ainda não entregues recentemente ao mesmo grupo de distribuição:
   - concurso/trilha;
   - disciplina e tópico;
   - faixa de dificuldade;
   - janela de tempo configurável.
3. Distribuir candidatos equivalentes de forma ponderada/aleatória, sem ordem fixa no catálogo.
4. Quando não houver questão inédita para o aluno, exibir estado explícito de catálogo concluído e oferecer revisão; não apresentar repetição como conteúdo novo.
5. Quando não houver alternativa sem colisão recente, relaxar somente a regra de colisão entre alunos — nunca a regra de não repetição para o próprio aluno sem avisar.

Essa política entrega personalização real sem impedir que uma mesma questão validada seja útil a diferentes alunos em momentos apropriados.

## 3. Modelo de dados proposto

As tabelas atuais de `question_attempts` preservam o fato de uma resposta. A nova arquitetura adiciona catálogo, entrega e conteúdo. Nomes podem ser refinados na migração, mantendo as responsabilidades.

```text
exams ─┬─ subjects ─ topics ─ review_contents
       │                    └─ questions
       │                         ↓
auth.users → question_assignments → question_attempts
                  ↓
           user_content_progress
```

### 3.1 Catálogo

| Entidade | Dados essenciais | Responsabilidade |
| --- | --- | --- |
| `exams` | nome, banca, cargo, ano, status | identifica concurso/trilha avaliada |
| `subjects` | exame, nome, ordem | organiza matérias do concurso |
| `topics` | disciplina, nome, objetivos | permite diagnosticar lacunas específicas |
| `questions` | exame, disciplina, tópico, dificuldade, enunciado, alternativas, resposta, explicação, fonte, versão, status | contém apenas questões publicadas e revisadas |
| `review_contents` | tópico, tipo, título, texto, exemplos, fonte, versão, status | material explicativo por tópico |

Questões e conteúdos devem ter origem, licença/direito de uso, versão e status editorial (`draft`, `review`, `published`, `archived`). Conteúdo jurídico, normativo ou avaliativo não pode ser publicado automaticamente sem revisão humana responsável.

### 3.2 Entrega individual

| Entidade | Dados essenciais | Regra |
| --- | --- | --- |
| `question_assignments` | `user_id`, `question_id`, contexto de seleção, entregue_em, iniciado_em, respondido_em | uma questão é entregue uma vez ao aluno fora de revisão; é a fonte de “questão nova” |
| `question_distribution_events` (opcional) | questão, grupo de distribuição, entregue_em | reduz colisões recentes entre alunos sem expor identidades |
| `question_attempts` | usuário, questão, disciplina, **tópico**, acerto, data, tentativa, revisão | mantém evento imutável de resposta |

Será necessária uma migração para adicionar `topic` — e, idealmente, `question_version` — a `question_attempts`. Apenas a disciplina não permite recomendar conteúdo de revisão suficientemente preciso.

Uma restrição única em `question_assignments(user_id, question_id)` impede que a seleção de estudo livre entregue duas vezes a mesma pergunta ao mesmo aluno. Revisões usam a mesma questão por uma ação deliberada do aluno, registrando uma nova tentativa em `question_attempts`.

## 4. Motor de seleção

O cliente React não consulta o catálogo diretamente para decidir o que entregar. A seleção deve ocorrer por uma função transacional no banco/API, por exemplo `assign_next_questions`.

```text
Aluno autenticado pede questões para uma trilha
       ↓
Servidor valida identidade e contexto
       ↓
Filtra questões publicadas e compatíveis
       ↓
Exclui entregas anteriores ao próprio aluno
       ↓
Desprioriza colisões recentes no grupo
       ↓
Equilibra tópico e dificuldade
       ↓
Reserva/entrega as questões atomicamente
       ↓
Cliente recebe somente as questões atribuídas
```

### Regras obrigatórias

- `user_id` deriva da sessão autenticada, nunca de parâmetro livre do navegador.
- A reserva e o registro da entrega ocorrem na mesma transação para evitar que dois pedidos recebam a mesma atribuição individual.
- A consulta usa somente questões `published` e conteúdo editorialmente aprovado.
- O algoritmo retorna um motivo estruturado para catálogo vazio, falta de conteúdo por tópico ou erro temporário.
- RLS permite o aluno ler apenas as próprias atribuições, tentativas e progresso de conteúdo.

## 5. Revisão adaptativa

### 5.1 Entrada

O aluno pode entrar por duas vias:

1. o Dashboard identifica erros/baixa performance em uma disciplina ou tópico;
2. o próprio aluno escolhe “Conteúdo de revisão” e seleciona a matéria/tópico que quer reforçar.

### 5.2 Experiência de conteúdo

```text
Matemática
  ↓
Porcentagem
  ↓
O que você vai revisar
  ↓
Explicação curta e objetiva
  ↓
Exemplo resolvido passo a passo
  ↓
Prática guiada
  ↓
Novas questões do tópico
```

O conteúdo precisa ser didático e verificável. Cada material deve ter:

- objetivo de aprendizagem;
- explicação em linguagem clara;
- exemplo resolvido;
- erro comum a evitar, quando aplicável;
- fonte/referência e versão;
- ação de retorno à prática.

O aplicativo pode registrar `opened_at`, `completed_at` e o tópico escolhido em `user_content_progress`, mas “conteúdo lido” não deve ser usado como evidência de domínio. A evolução continua baseada nas tentativas de questões.

## 6. Níveis e comunicação responsável

Os níveis da ZYNVO representam **prática dentro da plataforma**, calculada por volume de respostas e aproveitamento. Eles não são certificado, promessa de aprovação ou qualificação profissional.

Uma subida de nível pode ser comunicada logo após a tentativa que atende os critérios, com linguagem de incentivo honesta. A plataforma não deve afirmar que o aluno passará em concurso, prova ou processo seletivo; deve mostrar o que evoluiu e qual próximo passo tem maior valor.

## 7. Fora do escopo inicial

- IA que cria questões ou materiais diretamente em produção sem revisão editorial;
- bloqueio global permanente de uma questão após ser usada por qualquer aluno;
- ranking público, comparação entre alunos e exposição de desempenho individual;
- certificação profissional;
- importação automática de questões protegidas por direitos autorais;
- garantia/predição de aprovação.

## 8. Sequência de entrega recomendada

1. Criar catálogo relacional mínimo para um concurso-piloto, com questões e tópicos revisados.
2. Criar `question_assignments` e função transacional de entrega individual.
3. Migrar a sessão de questões do catálogo local para atribuições do usuário.
4. Adicionar conteúdo de revisão para um tópico-piloto, por exemplo Matemática → Porcentagem.
5. Registrar progresso de conteúdo e conectar Dashboard → revisão → novas questões.
6. Medir taxa de conclusão, retorno à prática e qualidade das questões antes de ampliar concursos.

## 9. Critérios de aceite

- [ ] Um aluno não recebe novamente em estudo livre uma questão já entregue a ele.
- [ ] Dois alunos podem receber conjuntos diferentes quando o catálogo oferece alternativas.
- [ ] Nenhuma política de distribuição permite leitura do histórico de outro aluno.
- [ ] Ao acabar o catálogo inédito, a interface informa o estado real e oferece revisão.
- [ ] A revisão pode iniciar por disciplina/tópico e possui explicação, exemplo e retorno à prática.
- [ ] Cada questão e conteúdo publicado possui fonte, versão e status editorial.
- [ ] O histórico por tópico alimenta recomendação sem alterar o motor de desempenho existente sem testes específicos.
