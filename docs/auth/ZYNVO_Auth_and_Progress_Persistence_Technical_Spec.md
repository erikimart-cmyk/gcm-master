# ZYNVO — Autenticação e Persistência de Progresso: Especificação Técnica

**Status:** proposta arquitetural — não autoriza implementação
**Objetivo:** substituir o estado exclusivamente em memória por uma jornada de aluno autenticada, privada e persistente entre recarregamentos e dispositivos.

## 1. Contexto atual

O Dashboard V1 está funcional, mas o `StudyProgressContext` hoje é a única fonte de estado durável durante uma sessão React. Ao recarregar a página, o aluno perde:

- o `StudyGoal` selecionado;
- contadores de questões, acertos e erros;
- resultados de questões (`QuestionResult[]`);
- dados derivados de desempenho, prioridade e revisão.

O contexto já calcula corretamente os dados de apresentação a partir de `questionResults`:

```text
questionResults
  ├── SubjectPerformanceCalculator → subjectPerformance
  ├── SubjectPriorityEngine        → prioritizedSubjects
  └── ReviewQuestionSelector       → reviewQuestions
```

Essa separação deve ser preservada. A persistência salva fatos de estudo; não salva uma segunda versão das regras de análise.

## 2. Resultados desejados

Ao final da futura implementação, um aluno autenticado deverá:

1. criar ou acessar uma conta de forma segura;
2. manter seu objetivo de estudo entre sessões;
3. manter resultados e histórico de questões entre dispositivos;
4. receber Dashboard e revisão derivados de seus próprios dados persistidos;
5. nunca acessar ou alterar progresso de outro aluno;
6. receber estados explícitos de carregamento, erro e sessão expirada.

## 3. Fora do escopo desta etapa

Esta especificação não inclui implementação de:

- telas visuais finais de login, cadastro ou recuperação de senha;
- cobrança, assinatura ou papéis administrativos;
- sincronização offline complexa e resolução de conflitos entre dispositivos;
- importação de histórico existente;
- analytics de produto, e-mails transacionais ou notificações;
- alteração do algoritmo de desempenho, prioridade ou revisão;
- mudanças no Dashboard V1 além de estados de carregamento/erro necessários;
- coleta de dados sensíveis que não sejam necessários para a operação do produto.

## 4. Decisões que precisam de aprovação antes do código

Há duas decisões de produto/infraestrutura que não devem ser assumidas pelo código:

### 4.1 Plataforma de autenticação e banco

Opções viáveis:

| Opção | Vantagem | Consequência |
| --- | --- | --- |
| Plataforma integrada de Auth + PostgreSQL (recomendação para a beta) | reduz infraestrutura inicial e oferece autenticação, banco e políticas de acesso no mesmo lugar | vincula a primeira versão a um fornecedor gerenciado |
| Auth gerenciado + banco próprio | separa fornecedores | mais integrações e operação desde o início |
| API própria + PostgreSQL próprio | máximo controle | maior custo de segurança, manutenção e entrega |

**Recomendação:** para a META/BETA, escolher uma plataforma gerenciada que combine autenticação e PostgreSQL, com políticas de acesso por linha. A escolha nominal do fornecedor, conta proprietária, região, orçamento e domínio de produção exigem aprovação explícita antes de criar recursos externos.

### 4.2 Entrada inicial do aluno

Definir um dos fluxos abaixo:

- **conta antes do onboarding:** o objetivo já nasce associado ao usuário;
- **onboarding como visitante + convite para criar conta:** reduz fricção, mas exige uma migração segura do estado local para a conta;
- **acesso somente por convite:** útil apenas se a beta for fechada.

**Recomendação:** conta antes do onboarding para a primeira versão persistente. É o fluxo mais simples de autorizar, auditar e testar. Um modo visitante pode ser adicionado mais tarde como projeto separado.

## 5. Modelo de dados proposto

O banco deve manter fatos imutáveis de estudo e dados mínimos de perfil. Métricas e prioridades continuam derivadas no aplicativo.

```text
auth.users (provedor de autenticação)
     │ 1:1
     ▼
profiles
     │ 1:1
     ▼
study_goals
     │ 1:N
     ├────────────────► question_attempts
     └────────────────► study_sessions (futuro próximo)
```

### `profiles`

| Campo | Tipo conceitual | Regra |
| --- | --- | --- |
| `id` | UUID | mesma chave do usuário autenticado |
| `display_name` | texto opcional | usado apenas se o aluno informar |
| `created_at` / `updated_at` | timestamp | definidos pelo servidor |

Não armazenar senha nesta tabela; ela pertence exclusivamente ao provedor de autenticação.

### `study_goals`

| Campo | Tipo conceitual | Regra |
| --- | --- | --- |
| `user_id` | UUID | chave única por aluno na V1 |
| `goal_id` | texto | deve corresponder a um ID conhecido de `studyGoals` |
| `selected_at` | timestamp | definido pelo servidor |

Na V1 há um objetivo principal. O título e a descrição continuam no catálogo versionado do cliente; persistir somente `goal_id` evita duplicação e facilita mudança de texto.

### `question_attempts`

| Campo | Tipo conceitual | Regra |
| --- | --- | --- |
| `id` | UUID | identificador do evento |
| `user_id` | UUID | dono do resultado |
| `question_id` | inteiro/texto | referência ao catálogo de questões atual |
| `subject` | texto | instantâneo do assunto no momento da resposta |
| `correct` | booleano | resposta avaliada |
| `answered_at` | timestamp | horário do servidor ou cliente normalizado em UTC |
| `attempt_number` | inteiro | sequência por usuário e questão |
| `is_review` | booleano | resposta gerada durante revisão |

O equivalente persistido de `QuestionResult` é um evento de tentativa, e não um contador agregado. Isso permite manter o comportamento atual: o resumo geral considera tentativas; a análise por disciplina pode considerar a última tentativa de cada questão, conforme o calculador existente.

### `study_sessions` (segunda subetapa)

Esta tabela não é necessária para a primeira migração se o aplicativo ainda não abre/fecha sessões de maneira consistente. Quando esse ciclo existir, registrar:

- `id`, `user_id`, `started_at`, `ended_at`;
- quantidade de questões, acertos e erros da sessão;
- origem (`study` ou `review`).

Até então, não usar `studySessions` do contexto como dado de negócio persistido: hoje ele não é atualizado pelo fluxo principal de respostas individuais.

## 6. Políticas de segurança e privacidade

- Toda leitura e escrita de dados de estudo exige um usuário autenticado.
- Cada tabela de domínio deve usar políticas que limitem `SELECT`, `INSERT`, `UPDATE` e `DELETE` ao próprio `user_id`.
- Nunca confiar em um `user_id` enviado pelo navegador; associar o registro à identidade da sessão validada no servidor/plataforma.
- Credenciais privadas, chaves administrativas e segredos jamais entram no bundle Vite ou no repositório.
- Variáveis públicas do cliente devem ser limitadas ao identificador/URL públicos estritamente necessários; privilégios administrativos ficam apenas em ambiente de servidor.
- Definir prazo de retenção, exportação e exclusão da conta antes de abrir a beta ao público.

## 7. Arquitetura no cliente

O React não deve chamar tabelas diretamente em componentes visuais. Criar uma camada de acesso separada, por exemplo:

```text
features/
├── auth/
│   ├── context/
│   ├── services/
│   └── pages/
└── study/
    ├── repositories/
    │   └── StudyProgressRepository.ts
    ├── services/
    │   └── hydrateStudyProgress.ts
    └── types/
```

Responsabilidades:

| Camada | Responsabilidade |
| --- | --- |
| componentes/páginas | interação e apresentação de estados |
| contexto | estado carregado, ações e estado de sincronização |
| repositório | operações persistentes de objetivo e tentativas |
| serviços existentes | cálculos puros de desempenho, prioridade e revisão |
| provedor de auth | identidade, sessão e renovação de token |

`StudyProgressContext` deve continuar expondo uma API de domínio semelhante à atual. A futura implementação troca a origem do estado, não espalha detalhes do banco pelo Dashboard ou onboarding.

## 8. Fluxo proposto

```text
Aplicativo abre
  ↓
Sessão autenticada?
  ├── não → tela/rota de autenticação
  └── sim → carregar StudyGoal e question_attempts do aluno
                 ↓
              hidratar StudyProgressContext
                 ↓
       Dashboard, onboarding e revisão consomem o mesmo estado
                 ↓
Aluno responde uma questão
  ↓
registrar tentativa persistente
  ↓
atualização otimista somente após validação de identidade
  ↓
recalcular dados derivados no cliente
```

No erro de sincronização, não marcar a tentativa como salva silenciosamente. Exibir mensagem recuperável e preservar a possibilidade de tentar novamente.

## 9. Plano de implementação em etapas

### Etapa A — decisão e infraestrutura

- aprovar fornecedor, região e projeto externo;
- criar ambientes separados de desenvolvimento e produção;
- configurar variáveis de ambiente fora do Git;
- definir políticas de acesso antes de conectar o cliente.

### Etapa B — identidade

- implementar provedor de sessão e rotas de autenticação;
- proteger rotas de onboarding, Dashboard e revisão conforme a decisão de produto;
- criar perfil no primeiro acesso autenticado;
- testar logout, sessão expirada e acesso não autorizado.

### Etapa C — persistir o objetivo

- salvar somente `goal_id`;
- hidratar o objetivo ao abrir o aplicativo;
- testar criação, troca e novo carregamento.

### Etapa D — persistir tentativas

- substituir a atualização exclusivamente local por criação de `question_attempts`;
- preservar o número de tentativa e `isReview`;
- recarregar o histórico e confirmar que Dashboard e revisão reproduzem os mesmos dados derivados.

### Etapa E — resiliência e observabilidade

- estados de carregamento, vazio, erro e nova tentativa;
- mensagens sem detalhes internos de segurança;
- logs técnicos sem respostas de questões ou dados pessoais desnecessários.

Cada etapa deve ter testes, build, revisão visual e commit próprio. Não combinar autenticação, banco, redesign e novos recursos de estudo em uma única mudança.

## 10. Estratégia de testes

### Unitários

- conversão entre registros persistidos e tipos de domínio;
- cálculo de `attempt_number`;
- hidratação vazia e com histórico;
- tratamento de falha do repositório;
- manutenção dos cálculos existentes com o mesmo conjunto de resultados.

### Integração

- um usuário só lê e grava seus próprios dados;
- objetivo salvo reaparece após novo carregamento;
- tentativa salva atualiza Dashboard e revisão;
- sessão expirada leva ao fluxo de autenticação sem perder a integridade do dado persistido.

### Segurança

- políticas de acesso negam leitura/escrita cruzada entre dois usuários de teste;
- nenhum segredo aparece em código cliente, bundle ou logs;
- operações administrativas não podem ser executadas pelo navegador.

### Regressão

- `pnpm test`;
- `pnpm build`;
- validação manual: autenticação → onboarding → Dashboard → questões → revisão → recarregar → Dashboard.

## 11. Critérios de aceite da primeira versão persistente

- [ ] A identidade do aluno é autenticada por um provedor aprovado.
- [ ] O objetivo persiste após recarregar e em outro dispositivo autenticado.
- [ ] Uma tentativa de questão persiste com dono, data, correção e contexto de revisão.
- [ ] Dashboard e revisão usam somente dados do aluno autenticado.
- [ ] O aplicativo não duplica a lógica de desempenho/prioridade para o banco.
- [ ] Estado de carregamento, ausência de dados e falha são distinguíveis.
- [ ] Um usuário não consegue consultar ou gravar dados de outro usuário.
- [ ] Testes, build e validação visual são aprovados.
- [ ] Nenhum segredo está versionado.

## 12. Próxima ação autorizável

Antes de código, aprovar:

1. a plataforma de Auth + PostgreSQL;
2. o fluxo de entrada do aluno (recomendado: conta antes do onboarding);
3. o ambiente externo de desenvolvimento e seu responsável.

Com essas decisões, a primeira tarefa de implementação deve ser somente a **Etapa A: infraestrutura e contrato de dados**, sem ainda migrar o `StudyProgressContext`.
