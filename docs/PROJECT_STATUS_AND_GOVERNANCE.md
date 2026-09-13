# ZYNVO — Baseline canônica e governança de status

## 1. Snapshot histórico — 04/09/2026

Registro efetuado em 04/09/2026 para orientar a fase de organização documental. Estes valores descrevem o estado **naquela data**; não são o HEAD atual.

| Item | Valor canônico naquela data |
| --- | --- |
| Repositório | `/Users/erison_souza/ZYNVO` |
| `HEAD` local | `353c0618708ed1079803f327141f7e3d0d6be83e` (`353c061`) |
| `origin/main` conhecido localmente | `d14fc6f3204b726b43c2253b047950bbfbfd7229` (`d14fc6f`) |
| Estado | working tree em organização, com alterações locais rastreadas e não rastreadas |

Os valores acima são referências de rastreabilidade daquela fase, não uma autorização para sincronização remota. **Naquela fase** não foram executados `push`, `pull`, `fetch`, `reset`, `clean`, `stash`, commit ou migration.

O `HEAD` `353c061` permanece o baseline da fase anterior e não deve ser apagado deste registro.

## 2. Estado após a organização Git

Registro do estado **local conhecido** após versionar o código funcional da organização. Não houve `fetch` recente nem `push` desta organização.

| Item | Valor |
| --- | --- |
| Repositório | `/Users/erison_souza/ZYNVO` |
| Branch | `main` |
| `HEAD` local | `c2b8155efb6bd44c79c0f9c2a68c91b6507d23c8` (`c2b8155`) |
| `origin/main` conhecido localmente | `d14fc6f3204b726b43c2253b047950bbfbfd7229` (`d14fc6f`) |
| Diferença conhecida localmente | `main` está **ahead 13** de `origin/main` |
| Push | ainda **não** houve push desta organização |
| Código funcional da organização | já versionado em `main` local |
| Documentação | em reconciliação com este HEAD |

Durante esta fase de organização, A–G são classificados conservadoramente como `EM IMPLEMENTAÇÃO`. Commits de organização ou evidências históricas de validação não promovem automaticamente o lifecycle. A promoção exige decisão explícita baseada na validação correspondente ao estado atualmente versionado.

| Bloco | Status vigente nesta fase |
| --- | --- |
| A — Dashboard v2 / engagement | `EM IMPLEMENTAÇÃO` |
| B — StudyTrack / onboarding / gates | `EM IMPLEMENTAÇÃO` |
| C — catálogo + sessão adaptativa | `EM IMPLEMENTAÇÃO` |
| D — conteúdo de revisão publicado | `EM IMPLEMENTAÇÃO` |
| F — planos | `EM IMPLEMENTAÇÃO` |
| G — landing / identidade | `EM IMPLEMENTAÇÃO` |

Nenhum desses blocos está em `EM VALIDAÇÃO`, `IMPLEMENTADO` ou `RELEASE` nesta fase.

## 3. Fluxo obrigatório de status

```text
IDEIA → ESPECIFICADO → EM IMPLEMENTAÇÃO → EM VALIDAÇÃO → IMPLEMENTADO → RELEASE
```

| Status | Significado mínimo |
| --- | --- |
| `IDEIA` | hipótese ou proposta ainda sem especificação aprovada |
| `ESPECIFICADO` | comportamento, limites e critérios de aceite documentados |
| `EM IMPLEMENTAÇÃO` | trabalho técnico iniciado, ainda incompleto ou sem prontidão para validação integral |
| `EM VALIDAÇÃO` | implementação presente e candidata a verificação; testes, build, revisão manual e critérios aplicáveis ainda precisam ser confirmados |
| `IMPLEMENTADO` | critérios de aceite e verificações aplicáveis aprovados, com mudança integrada e rastreável no repositório |
| `RELEASE` | implementação disponibilizada no ambiente/release definido, após as etapas anteriores |

## 4. Regras de interpretação

- Aparecer na UI não significa estar `IMPLEMENTADO` nem em `RELEASE`.
- Existir no working tree significa apenas que há materialização local; sem validação e commit, o máximo apropriado é `EM VALIDAÇÃO`.
- A existência de testes não equivale à sua execução nem à sua aprovação.
- Um commit isolado não promove o lifecycle.
- Critérios de aceite permanecem desmarcados enquanto não houver evidência verificável de validação.
- Documentação deve distinguir explicitamente o que é **estado vigente**, o que é **histórico datado** (incluindo materialização apenas no working tree ou ainda não commitada naquela data) e o que ainda **não foi validado**.
- Mudanças de nomenclatura, arquitetura, dados ou migrations exigem decisão e fase próprias; não podem ser inferidas de uma atualização de status documental.

O status vigente dos blocos desta organização deve ser lido na seção 2 deste documento.

## 5. Decisão pendente de nomenclatura do piloto

O identificador técnico `gcm-vunesp-pilot` permanece presente enquanto a definição editorial atual aponta para o piloto da Prefeitura de Limeira, Guarda Civil Municipal – 3ª Classe, organizado pela AVANÇASP.

Essa inconsistência está registrada como decisão pendente. Nenhum identificador, referência, arquivo ou dado deve ser renomeado até que sejam avaliados impacto em migrations, chaves persistidas, integrações, compatibilidade e estratégia de transição.
