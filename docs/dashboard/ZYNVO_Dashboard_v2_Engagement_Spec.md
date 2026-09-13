# ZYNVO — Dashboard V2: Engajamento baseado em progresso real

**Status vigente:** **EM IMPLEMENTAÇÃO**. Fonte: `docs/PROJECT_STATUS_AND_GOVERNANCE.md`. Isto não é `RELEASE`.

O código do Dashboard v2 / engagement foi versionado em `a1e4a24`. O aviso de level-up / toast residual na sessão de questões foi versionado em `c2b8155`. Os relatos 2C/2D abaixo permanecem evidência histórica daquele working tree; **não** são revalidação do estado atualmente versionado após `c2b8155`.

**Leitura histórica em 07/09/2026 (não é o estado Git atual):** a implementação correspondente estava presente no working tree canônico sobre o baseline `353c061` e ainda **não** havia sido commitada. Naquela data isso significava:

- **implementado no working tree:** estado de engajamento, missão diária, narrativa de progresso, nível de prática, refinamento da lista de disciplinas e integração desses blocos ao Dashboard materializados em arquivos locais;
- **validado naquele conjunto:** critérios de aceite comprovados pela revisão manual da Fase 2C e pelos testes determinísticos da Fase 2D;
- **ainda não commitado naquela data:** alterações locais sobre `353c061`; o versionamento organizado ainda era a próxima ação.

Naquela leitura histórica a entrega podia ser descrita como `IMPLEMENTADO` no working tree, mas não como `RELEASE`.

**Histórico de produto:** esta V2 evolui a `ZYNVO_Dashboard_v1_Technical_Spec.md`; a V1 permanece preservada como registro das decisões anteriores e não é substituída retroativamente.

## 1. Objetivo

O Dashboard V2 deve transformar o acompanhamento de estudo em uma direção clara para o aluno: entender sua evolução, saber qual é a melhor próxima ação e sentir que cada sessão tem impacto no objetivo escolhido.

O objetivo não é maximizar tempo de tela por mecanismos artificiais. A retenção deve acontecer porque a plataforma oferece valor, clareza e uma rotina sustentável de estudo.

## 2. Princípios

- Mostrar somente fatos derivados de `StudyProgressContext` e dados persistidos do aluno.
- Toda celebração, meta e recomendação precisa ser verificável pelo aluno.
- Priorizar uma única ação principal por tela.
- Não usar contadores regressivos, recompensas falsas, ranking compulsório ou notificações manipulativas.
- Preservar os cálculos existentes de desempenho, prioridade e revisão.

## 3. Nova hierarquia do Dashboard

```text
Cabeçalho / objetivo
        ↓
Missão de hoje + CTA principal
        ↓
Resumo de evolução
        ↓
Disciplinas em destaque + ponto de atenção
        ↓
Próximo passo / continuidade
```

### 3.1 Missão de hoje

Novo bloco de maior destaque, acima do resumo numérico. Ele responde: **“o que devo fazer agora?”**

| Estado real                    | Mensagem                                            | CTA                 |
| ------------------------------ | --------------------------------------------------- | ------------------- |
| Sem histórico                  | “Dê o primeiro passo: responda 5 questões.”         | Começar estudando   |
| Há prioridade                  | “Reforce [disciplina] com uma revisão direcionada.” | Revisar agora       |
| Sem prioridade e com histórico | “Mantenha seu ritmo com novas questões.”            | Continuar estudando |

Na primeira entrega, a missão é uma orientação de interface; ela não afirma que uma meta diária foi salva ou concluída. Metas configuráveis e persistidas exigem uma etapa própria de dados.

Ao iniciar estudo livre, a seleção deve priorizar questões que o aluno nunca respondeu. Se o catálogo disponível tiver sido concluído, a interface deve explicar isso explicitamente e oferecer revisão; ela não pode repetir uma questão como se fosse conteúdo novo. Novas questões além do catálogo dependem de uma etapa de conteúdo, não de uma regra de interface.

### 3.2 Evolução em linguagem humana

O resumo atual continua mostrando respondidas, acertos, erros e aproveitamento, mas ganha uma frase de contexto calculada a partir desses números.

Exemplos permitidos:

- “Você acertou 11 de 14 questões.”
- “Seu aproveitamento atual é de 79%.”
- “Há 3 respostas para revisar.”

É permitido mostrar a distância até um marco simples, como 80% de aproveitamento, somente quando o cálculo for exato e a fórmula estiver baseada nas tentativas reais. Não exibir previsão de aprovação ou estimativas de desempenho futuro.

### 3.3 Disciplinas em destaque

`subjectPerformance` permanece como fonte única.

- Mostrar inicialmente as três disciplinas mais relevantes para leitura rápida.
- Destacar visualmente a principal prioridade, quando existir.
- Oferecer “Ver desempenho completo” para expandir a lista sem tornar o Dashboard uma parede de barras.
- Usar cor como apoio, nunca como única forma de comunicar o resultado.

### 3.4 Atenção e continuidade

`prioritizedSubjects` continua definindo o ponto de atenção.

- Com prioridade: explicar disciplina, aproveitamento e ação de revisão.
- Sem prioridade: reconhecer o estado positivo e ainda oferecer uma ação concreta de continuidade.
- Sem histórico: explicar que ainda não há análise suficiente, sem apresentar “Você está em dia”.

### 3.5 Nível de prática

O Dashboard pode apresentar uma progressão de prática derivada de volume de respostas e aproveitamento global: **Iniciante**, **Em desenvolvimento**, **Intermediário**, **Avançado** e **Prática profissional**.

O rótulo informa evolução dentro da ZYNVO; não é certificado, promessa de aprovação, qualificação profissional nem previsão de resultado em concurso ou prova. A mudança para um nível acima deve ser avisada após a resposta que atingiu os critérios.

## 4. Componentes propostos

```text
features/dashboard/
├── components/
│   ├── DailyMissionCard.tsx
│   ├── ProgressNarrative.tsx
│   ├── SubjectHighlights.tsx
│   ├── PriorityCard.tsx
│   └── …componentes V1 preservados/refinados
├── services/
│   └── getDashboardEngagementState.ts
└── types/
    └── DashboardEngagementState.ts
```

`getDashboardEngagementState` deve ser uma função pura. Ela recebe dados já calculados pelo contexto e retorna conteúdo/ações para os três estados; não acessa Supabase, não navega e não recria regras do motor de revisão.

## 5. Estados de interface

| Estado                        | Missão                           | Evolução                            | Atenção                       |
| ----------------------------- | -------------------------------- | ----------------------------------- | ----------------------------- |
| Carregando                    | feedback discreto; CTA bloqueado | esqueletos ou texto de carregamento | não inferir resultado         |
| Sem histórico                 | primeiro bloco de estudo         | sem percentual                      | explicação neutra             |
| Com histórico, sem prioridade | continuidade                     | fatos reais                         | reconhecimento + nova prática |
| Com prioridade                | revisão direcionada              | fatos reais                         | disciplina e CTA de revisão   |
| Erro de sincronização         | mensagem recuperável             | preservar apenas dados confirmados  | não afirmar estado positivo   |

## 6. Responsividade e acessibilidade

- Mobile: missão e CTA aparecem antes dos cards de métricas; não pode haver rolagem horizontal.
- Desktop: missão ocupa a área principal sem competir com o resumo.
- Todos os CTAs têm rótulos explícitos; não depender apenas de ícones ou cor.
- Indicadores de progresso devem ter texto equivalente para leitores de tela.
- Respeitar `prefers-reduced-motion`; animações são de reforço, não requisito para entender a tela.

## 7. Fora do escopo desta entrega

- sequência diária (streak), XP, medalhas, ranking e leaderboard;
- metas semanais persistidas;
- certificados, previsão de aprovação ou qualificação profissional baseada apenas nas questões;
- previsão de aprovação, IA motivacional ou mensagens personalizadas por modelo;
- redes sociais, feed, comunidade e notificações push;
- alterações no algoritmo de desempenho, prioridade ou revisão;
- mudanças de banco além das já necessárias para o progresso existente.

Esses recursos podem ser discutidos após validar que a missão e a recomendação realmente ajudam o aluno a iniciar e concluir sessões de estudo.

## 8. Critérios de aceite

- [x] A missão corresponde aos três estados reais já previstos pelo Dashboard.
- [x] Cada CTA leva ao fluxo coerente de estudo ou revisão.
- [x] Nenhuma métrica, marco ou elogio é inventado.
- [x] `subjectPerformance` e `prioritizedSubjects` seguem como fontes únicas.
- [x] Carregamento e erro são explícitos e não produzem recomendações falsas.
- [x] Desktop e mobile são validados sem overflow horizontal.
- [x] A suíte de testes, lint, build e revisão manual continuam aprovados.

### Validação da Fase 2B — correções mínimas

Em 05/09/2026, a Fase 2B corrigiu, sem refatoração estrutural ou mudança de schema:

- bloqueio das métricas e recomendações derivadas durante carregamento ou erro do progresso;
- orientação para seleção de trilha antes de iniciar estudo novo em objetivos de concurso, preservando revisão e objetivos que não exigem trilha;
- narrativa baseada na quantidade atual de questões pendentes segundo a tentativa mais recente;
- presença e identificação textual da principal prioridade entre as três disciplinas inicialmente visíveis;
- remoção da ação visual redundante do `NextStepCard`, mantendo sua orientação textual;
- comparação de `level-up` contra o estado mais recente e preservação monotônica do maior rank alcançado no histórico conhecido;
- marcos que passam a pedir aproveitamento, e não volume já cumprido;
- continuidade acionável nos estados vazios da sessão de questões;
- semântica de `progressbar` e desativação da transição da barra da sessão com `prefers-reduced-motion`.

Validação automatizada alcançada nesta fase:

- testes direcionados: 3 arquivos e 27 testes aprovados;
- suíte completa: 12 arquivos e 54 testes aprovados;
- build de produção (`tsc -b` e Vite): aprovado, com aviso não bloqueante preexistente sobre chunk acima de 500 kB;
- `git status` permaneceu sem mutações inesperadas após testes e build.

**Leitura histórica da Fase 2B:** o status de governança naquela fase permaneceu **EM VALIDAÇÃO**: lint, navegação, responsividade e revisão manual ainda não haviam sido executados então. Isso não substitui o status vigente no cabeçalho nem em `docs/PROJECT_STATUS_AND_GOVERNANCE.md`.

**Limitação conhecida do nível monotônico:** não foi criado campo persistido para o maior rank. O rank é reconstruído a partir do histórico cronológico de tentativas disponível; portanto, a garantia depende de esse histórico permanecer completo e carregável. A persistência explícita de maior rank exigiria uma decisão posterior de dados/schema.

### Validação das Fases 2C e 2D — fechamento

Em 07/09/2026, a Fase 2C concluiu a revisão manual disponível em desktop e mobile, incluindo hierarquia visual, ausência de overflow horizontal em 390 × 844, navegação das rotas do bloco, estados vazios, barreira de trilha, loading, foco por teclado, progressbars, alertas, reduced motion e inspeção do console.

A Fase 2D fechou deterministicamente os cenários que não deveriam ser forçados com a conta real ou com gravação remota:

- primeiro acesso com missão `first-step`, CTA coerente e ausência de percentual enganoso;
- prioridade ativa aplicada à missão, à disciplina inicialmente visível e a um único CTA principal;
- loading e falha de hidratação bloqueando métricas e recomendações derivadas, com estados acessíveis;
- montagem segura de `/revisao/conteudo`, retorno para `/revisao` e contrato de leitura/conclusão exercitado com cliente Supabase integralmente simulado;
- objetivo de concurso sem trilha orientando para `/onboarding` sem montar sessão impossível.

Validação automatizada final:

- testes direcionados: 8 arquivos e 39 testes aprovados;
- suíte completa: 16 arquivos e 64 testes aprovados;
- lint completo: aprovado;
- build de produção (`tsc -b` e Vite): aprovado, com aviso não bloqueante sobre chunk acima de 500 kB;
- `git diff --check`: aprovado;
- nenhum dado remoto foi gravado e nenhuma migration ou schema foi alterado na Fase 2D.

**Leitura histórica ao fechar 2C/2D (07/09/2026):** o status então recomendado para aquele working tree foi **IMPLEMENTADO**, com o bloco pronto para um commit organizado após revisão do diff. Isso não representava `RELEASE` e **não** promove o status vigente após a organização Git nem revalida o código posterior em `c2b8155`.

## 9. Ordem de entrega recomendada

1. Implementar `DashboardEngagementState` com testes para os estados existentes.
2. Criar `DailyMissionCard` e a narrativa de progresso com dados reais.
3. Refinar hierarquia visual e responsividade do Dashboard.
4. Aplicar o mesmo vocabulário de missão e feedback na sessão de questões e na revisão.
5. Somente depois avaliar metas persistidas, streak e evolução semanal.
