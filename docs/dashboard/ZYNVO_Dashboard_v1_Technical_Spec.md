# ZYNVO — Dashboard v1: Especificação Técnica

**Status:** especificação arquitetural aprovada para implementação futura  
**Escopo deste documento:** Dashboard v1 e suas dependências de domínio. Este documento não implementa mudanças.

## 1. Objetivo e responsabilidade

O Dashboard v1 transforma dados reais já produzidos pelo motor de estudos em uma visão clara da evolução do aluno e de sua próxima ação.

Ele é uma camada de apresentação: não cria um segundo motor de inteligência, não recalcula regras de desempenho ou prioridade e não exibe métricas inventadas.

```text
StudyProgressContext
├── progress
├── subjectPerformance
├── prioritizedSubjects
└── reviewQuestions
          ↓
     Dashboard v1
```

O ciclo de produto pretendido é:

> Objetivo → Estudo → Resultado → Análise → Próxima ação → Novo estudo.

## 2. Modelo de domínio: `StudyGoal`

O objetivo de estudo deve se tornar um conceito real do domínio, definido fora dos componentes visuais.

```ts
type StudyGoal = {
  id: string;
  title: string;
  description?: string;
};
```

Na V1, cada aluno possui somente **um objetivo principal**. Não há seleção múltipla.

| ID | Título |
| --- | --- |
| `concursos` | Concursos |
| `idiomas` | Idiomas |
| `tecnologia` | Tecnologia |
| `novas-habilidades` | Novas Habilidades |
| `carreira` | Carreira |
| `explorar` | Explorar |

Os objetivos devem ser dados estruturados centralizados, para poderem ser reutilizados por onboarding, Dashboard, perfil, recomendações, analytics e uma futura persistência — sem textos duplicados.

## 3. Estado global e fonte de dados

O objetivo deve ficar inicialmente no `StudyProgressContext`, no mesmo domínio do progresso do aluno:

```ts
studyGoal: StudyGoal | null;
setStudyGoal(goal: StudyGoal): void;
```

`null` representa corretamente que o aluno ainda não escolheu um objetivo. Na V1 isso é somente estado da aplicação; não haverá banco de dados, API, Prisma, PostgreSQL, autenticação ou persistência local.

O Dashboard consome do contexto:

| Dado | Uso no Dashboard |
| --- | --- |
| `progress.questionsAnswered` | quantidade de questões respondidas e definição de histórico |
| `progress.correctAnswers` | total de acertos e cálculo de aproveitamento |
| `progress.wrongAnswers` | total de erros |
| `subjectPerformance` | desempenho por disciplina |
| `prioritizedSubjects` | pontos de atenção e recomendação de revisão |
| `reviewQuestions` | dado disponível para o fluxo de revisão; não deve ser reinterpretado pelo Dashboard |
| `studyGoal` | objetivo exibido ao aluno |

## 4. Fluxo do onboarding

A seleção hoje é local ao `GoalGrid`; a evolução proposta é:

```text
GoalGrid
  ↓ seleciona um StudyGoal
setStudyGoal(goal)
  ↓
StudyProgressContext
  ↓
Onboarding e Dashboard consomem a mesma fonte de verdade
```

O `GoalGrid` apenas apresenta os objetivos e registra a escolha. Ele não deve navegar diretamente para o Dashboard. O botão **“Começar Minha Jornada”** deve usar `studyGoal !== null` para saber se a jornada pode começar; a decisão de navegação permanece no fluxo de onboarding.

## 5. Rota proposta

A rota proposta para o Dashboard funcional é `/dashboard`.

```text
/                   Landing
/onboarding          Escolha do objetivo
/dashboard           Dashboard principal
/revisao             Revisão inteligente
/revisao/questoes    Sessão de questões
```

A definição final de navegação ocorrerá na implementação. Esta etapa não cria rotas.

## 6. Blocos do Dashboard

O Dashboard v1 possui seis blocos, todos baseados em estado real:

1. **Saudação:** contextualiza o aluno, por exemplo “Olá, Erison 👋” e “Continue construindo sua evolução.” Não requer personalização avançada na V1.
2. **Objetivo:** exibe o `StudyGoal` selecionado, por exemplo “🎯 Seu objetivo — Concursos”. Nunca deve hardcodear “Concursos”.
3. **Resumo de desempenho:** mostra questões respondidas, acertos, erros e aproveitamento a partir de `progress`.
4. **Desempenho por disciplina:** apresenta `subjectPerformance`; não recria o cálculo existente.
5. **Pontos de atenção:** usa `prioritizedSubjects`, exibindo a principal prioridade quando houver uma, ou um estado positivo quando não houver.
6. **Próximo passo recomendado:** direciona para estudar, continuar estudando ou revisar, conforme os estados definidos abaixo.

Os valores de mockup são apenas ilustrativos. O Dashboard funcional não pode apresentar dados fictícios.

## 7. Aproveitamento e ausência de histórico

O aproveitamento é calculado por:

```text
correctAnswers / questionsAnswered × 100
```

Quando `questionsAnswered === 0`, não existe percentual válido. O Dashboard deve mostrar um estado inicial em vez de `0%`, pois `0%` sugere baixo desempenho, enquanto a ausência de dados significa que o aluno ainda não estudou. A implementação deve impedir divisão por zero.

## 8. Desempenho por disciplina

Fonte única: `subjectPerformance`.

O Dashboard deve somente apresentar o resultado já calculado pelo domínio de estudos. Não deve copiar ou reconstruir a lógica de `SubjectPerformanceCalculator`.

## 9. Pontos de atenção

Fonte única: `prioritizedSubjects`.

- Se `prioritizedSubjects[0]` existir, o Dashboard pode mostrar “Sua principal prioridade” e a disciplina correspondente.
- Se não houver prioridade, deve apresentar um estado positivo, como “Você está em dia!”.

O Dashboard não acessa estruturas internas do motor de revisão para recalcular prioridades.

## 10. Próximo passo recomendado

Não haverá outro motor de recomendação na V1. A recomendação deriva diretamente do estado já disponível:

| Estado | Condição | Mensagem/ação esperada |
| --- | --- | --- |
| Sem histórico | `questionsAnswered === 0` | “Comece sua jornada”; orientar a iniciar os estudos; ação “Começar estudando”. |
| Histórico sem erros pendentes | há histórico e `prioritizedSubjects` está vazio | “Você está em dia! 🎉”; ação “Continuar estudando”. |
| Histórico com erros | `prioritizedSubjects.length > 0` | exibir prioridade e sugerir revisão; ação “Revisar agora”. |

Uma ação de revisão deve levar a `/revisao` ou, se a UX definir isso na implementação, a `/revisao/questoes?mode=errors`.

## 11. Estados obrigatórios

### A. Primeiro acesso

`questionsAnswered = 0`.

Mostrar que a jornada está começando. Não exibir gráficos vazios, `0%` de desempenho ou recomendações falsas.

### B. Há histórico, sem erros pendentes

Há histórico e `prioritizedSubjects = []`.

Mostrar estado positivo e continuidade do estudo.

### C. Há pontos de atenção

`prioritizedSubjects.length > 0`.

Mostrar a disciplina priorizada e uma chamada para revisão.

## 12. Estrutura proposta de componentes

O Dashboard funcional nasce em sua própria feature:

```text
features/dashboard/
├── components/
│   ├── DashboardHeader.tsx
│   ├── GoalCard.tsx
│   ├── PerformanceSummary.tsx
│   ├── SubjectPerformance.tsx
│   ├── PriorityCard.tsx
│   └── NextStepCard.tsx
├── pages/
│   └── DashboardPage.tsx
└── types/
    └── ...
```

Os nomes podem ser refinados durante a implementação, sem mudar as responsabilidades.

`DashboardPreview.tsx` continua sendo um componente de marketing/demo da Landing Page. Ele **não deve ser convertido diretamente** no Dashboard funcional, nem ser tomado como fonte de métricas reais.

## 13. Regras arquiteturais

- O Dashboard é consumidor de estado; não é fonte paralela de verdade.
- Não duplicar os cálculos de desempenho, prioridade ou seleção de revisão.
- `subjectPerformance`, `prioritizedSubjects` e `reviewQuestions` são entregues pelo `StudyProgressContext` para apresentação e navegação apropriadas.
- O objetivo é centralizado como `StudyGoal`, e não repetido em componentes.
- `GoalGrid` não controla a navegação do produto.
- Todo conteúdo exibido deve derivar de dados reais ou de um estado vazio explícito; métricas demonstrativas não podem vazar para a feature funcional.
- Mudanças devem preservar a separação: documentação → implementação pequena e isolada → testes → build → revisão → commit.

## 14. Fora do escopo da V1

Ficam explicitamente fora desta versão:

- horas estudadas, streak, XP, ranking, medalhas e gamificação;
- IA conversacional;
- gráficos complexos;
- previsão ou percentual estimado de aprovação;
- calendário completo;
- cursos, assinaturas, comunidade e feed social;
- backend, banco de dados, persistência local, Prisma, PostgreSQL e login;
- múltiplos objetivos;
- redesign do onboarding;
- alterações no motor de revisão.

Essas ideias podem permanecer no Banco Mestre de Ideias, mas não são entregas do Dashboard v1.

## 15. Critérios de aceite

### Objetivo

- [ ] O aluno consegue selecionar um objetivo.
- [ ] O objetivo fica disponível globalmente.
- [ ] O Dashboard mostra o objetivo correto.
- [ ] Nenhum objetivo é hardcoded.

### Desempenho

- [ ] Questões respondidas, acertos e erros são valores reais.
- [ ] O aproveitamento é calculado corretamente.
- [ ] Não há divisão por zero.
- [ ] Ausência de histórico não é apresentada como `0%`.

### Disciplinas e prioridades

- [ ] O desempenho por disciplina utiliza `subjectPerformance`.
- [ ] Não há duplicação dos cálculos existentes.
- [ ] Pontos de atenção usam `prioritizedSubjects`.
- [ ] Há prioridade quando ela existir e estado positivo quando não existir.

### Próximo passo e qualidade

- [ ] Primeiro acesso orienta a estudar.
- [ ] Sem pendências orienta a continuar.
- [ ] Com pendências orienta a revisar.
- [ ] Navegação funciona.
- [ ] Layout é responsivo e possui acessibilidade básica.
- [ ] TypeScript não apresenta erros.
- [ ] Testes e build existentes continuam passando.
- [ ] Não há informação fictícia na feature funcional.

## 16. Estratégia de testes

Antes de considerar a implementação concluída, cobrir:

1. **`StudyGoal`:** tipo criado, seis objetivos presentes, IDs únicos e seleção única.
2. **Contexto:** `studyGoal` inicia em `null`; `setStudyGoal` atualiza o valor; consumidores recebem a atualização.
3. **Onboarding:** seleção visual permanece correta, sobrevive a re-renderizações e não mantém dois estados concorrentes para o mesmo objetivo.
4. **Dashboard:** os três estados obrigatórios, cálculo de aproveitamento, ausência de percentual sem histórico, exibição de disciplinas e de prioridades a partir das fontes oficiais.
5. **Regressão:** executar a suíte existente e o build do workspace (`pnpm test` e `pnpm build`, ou os comandos definidos pelos pacotes) e validar a navegação manualmente.

## 17. Sequência de implementação posterior

Esta especificação não autoriza implementação. A primeira mudança futura será pequena e isolada: criar `StudyGoal`, centralizar os seis objetivos e conectá-lo ao `StudyProgressContext` e ao `GoalGrid`. Somente depois vêm rota, componentes do Dashboard, testes, build, revisão e commit.
