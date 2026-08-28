# Plan — Agent Engineering Skills

## 1. Objetivo

Criar um repositório de skills modulares para agentes de IA voltadas a:

* engenharia de software;
* auditoria de sistemas;
* descoberta de bugs;
* análise de regras de negócio;
* segurança;
* UX/UI;
* acessibilidade;
* arquitetura;
* pesquisa de referências;
* análise de implementações reais;
* pesquisa de produtos e mercado.

O agente deve ser capaz de **entender → pesquisar → questionar → testar → verificar → implementar → revisar**.

A filosofia central:

> **Don't just review the code. Attack the assumptions behind the system.**

---

# 2. Princípios

### 2.1 Skills ensinam como pensar

Uma skill não deve ser apenas uma lista de comandos.

Ela deve fornecer:

* modelo mental;
* perguntas;
* heurísticas;
* padrões de ataque;
* processo de investigação;
* critérios de evidência;
* critérios de falso positivo;
* formato de saída.

---

### 2.2 Referências ensinam onde olhar

Sites, projetos, produtos e documentações externas não ficam espalhados pelas skills.

Eles devem existir em um catálogo centralizado.

```text
skills/
    como pensar

knowledge/
    o que considerar

references/
    onde pesquisar
```

---

### 2.3 Pesquisar antes de reinventar

Para tarefas não triviais, o agente deve perguntar:

> "Alguém já resolveu esse problema?"

Quando apropriado, pesquisar:

1. código existente no projeto;
2. documentação oficial;
3. GitHub;
4. produtos reais;
5. design systems;
6. sites especializados;
7. artigos técnicos;
8. galerias de inspiração.

---

### 2.4 Referências não são especificações

O agente deve extrair:

* princípios;
* padrões;
* decisões;
* trade-offs;
* soluções;
* problemas conhecidos.

Não deve copiar cegamente:

* código;
* layout;
* branding;
* identidade visual;
* conteúdo;
* componentes proprietários.

---

### 2.5 Evidência > especulação

Findings devem ser classificados como:

```text
CONFIRMED
HIGH CONFIDENCE
POSSIBLE
SPECULATIVE
```

O agente deve evitar transformar uma hipótese em bug confirmado.

---

# 3. Estrutura do repositório

```text
agent-engineering-skills/
│
├── AGENTS.md
├── README.md
├── LICENSE
├── plan.md
│
├── skills/
│   │
│   ├── audit/
│   │   ├── adversarial-review/
│   │   ├── user-flow-audit/
│   │   ├── business-logic-audit/
│   │   ├── edge-case-hunter/
│   │   ├── state-consistency-audit/
│   │   ├── error-flow-audit/
│   │   └── dead-end-flow-audit/
│   │
│   ├── security/
│   │   ├── authorization-audit/
│   │   ├── api-abuse-audit/
│   │   └── input-trust-audit/
│   │
│   ├── reliability/
│   │   ├── race-condition-hunter/
│   │   ├── idempotency-audit/
│   │   └── data-integrity-audit/
│   │
│   ├── product/
│   │   └── gamification-audit/
│   │
│   ├── frontend/
│   │   ├── ux-review/
│   │   ├── visual-quality-review/
│   │   ├── interaction-design/
│   │   ├── animation-review/
│   │   └── accessibility-review/
│   │
│   ├── research/
│   │   ├── reference-research/
│   │   ├── github-reference-research/
│   │   ├── market-research/
│   │   └── implementation-research/
│   │
│   └── meta/
│       ├── skill-router/
│       └── research-router/
│
├── knowledge/
│   ├── frontend/
│   ├── engineering/
│   ├── security/
│   ├── product/
│   └── research/
│
├── references/
│   ├── frontend.yaml
│   ├── ux.yaml
│   ├── engineering.yaml
│   ├── security.yaml
│   ├── product.yaml
│   └── research.yaml
│
├── templates/
│   ├── audit-report.md
│   ├── bug-report.md
│   ├── design-review.md
│   └── research-report.md
│
├── examples/
│   ├── xp-reward-loop.md
│   ├── race-condition.md
│   ├── authorization-bypass.md
│   └── frontend-review.md
│
└── docs/
    ├── philosophy.md
    ├── skill-authoring.md
    ├── reference-authoring.md
    └── agent-integration.md
```

---

# 4. Fase 1 — Foundation

Criar:

```text
AGENTS.md
README.md
plan.md
LICENSE
```

## AGENTS.md

Definir as regras globais do agente:

* investigar antes de concluir;
* pensar em invariantes;
* considerar estados;
* testar repetição;
* testar reversão;
* testar concorrência;
* não confiar no frontend;
* verificar APIs diretamente;
* pesquisar referências quando necessário;
* distinguir inspiração de evidência;
* minimizar falsos positivos;
* reportar evidências.

---

# 5. Fase 2 — Skill specification

Definir um formato padrão para todas as skills.

Cada skill deverá conter:

```text
SKILL.md
```

Formato:

```yaml
---
name: skill-name
description: Short description
category: audit
triggers:
  - trigger
  - another trigger
priority: high
---
```

Estrutura:

```markdown
# Skill Name

## Objective

## When to Use

## Mental Model

## Investigation Procedure

## Questions to Ask

## Attack Patterns

## Evidence Requirements

## False Positives

## Output Format
```

Nenhuma skill deve depender de conhecimento implícito que não esteja documentado ou disponível através das referências.

---

# 6. Fase 3 — Core audit skills

Implementar primeiro:

### `adversarial-review`

Ensina o agente a pensar como:

* usuário curioso;
* usuário malicioso;
* power user;
* usuário descuidado;
* usuário concorrente;
* usuário com estado antigo.

Explorar:

```text
repeat
reverse
reorder
skip
replay
concurrent
manipulate
```

---

### `user-flow-audit`

Mapear:

```text
entry
→ preconditions
→ action
→ state change
→ feedback
→ next state
```

Detectar:

* dead ends;
* estados impossíveis;
* passos puláveis;
* estados inconsistentes;
* refresh problems;
* back-button problems;
* operações duplicadas.

---

### `business-logic-audit`

Identificar:

* regras;
* invariantes;
* limites;
* ownership;
* transições;
* recompensas.

Para cada regra:

```text
Where is it enforced?
Can it be bypassed?
Can it be repeated?
Can it be reversed?
Can it race?
```

---

### `edge-case-hunter`

Gerar casos envolvendo:

* null;
* empty;
* zero;
* negative;
* huge values;
* duplicates;
* Unicode;
* stale data;
* deleted data;
* expired data;
* repeated valid actions.

---

### `state-consistency-audit`

Comparar:

```text
database
API
server state
cache
client state
URL state
```

Procurar divergências.

---

### `error-flow-audit`

Investigar:

```text
partial success
timeouts
lost responses
retries
crashes
rollback failures
```

---

### `dead-end-flow-audit`

Encontrar estados dos quais o usuário não consegue continuar ou recuperar.

---

# 7. Fase 4 — Security skills

Implementar:

### `authorization-audit`

Analisar:

```text
authenticated
authorized
owner
moderator
admin
resource participant
```

Verificar autorização no servidor.

---

### `api-abuse-audit`

Tratar a API como diretamente acessível.

Investigar:

* repetição;
* replay;
* manipulação de IDs;
* campos extras;
* endpoints alternativos;
* ausência de rate limiting;
* bypass da UI.

---

### `input-trust-audit`

Identificar valores que nunca deveriam ser confiados ao cliente:

```text
userId
role
price
XP
permissions
ownership
status
reward
timestamps
```

---

# 8. Fase 5 — Reliability skills

Implementar:

### `race-condition-hunter`

Procurar:

```text
READ
↓
DECISION
↓
WRITE
```

e perguntar:

> "O que acontece se outro request modificar o estado entre essas operações?"

---

### `idempotency-audit`

Testar:

```text
request
request
request
```

e:

```text
request
response lost
retry
```

Especialmente:

* pagamentos;
* rewards;
* criação;
* webhooks;
* notificações;
* contadores.

---

### `data-integrity-audit`

Verificar:

* unique constraints;
* foreign keys;
* transactions;
* cascading;
* soft delete;
* enums;
* database constraints.

O banco deve impedir estados impossíveis sempre que apropriado.

---

# 9. Fase 6 — Product skills

Implementar:

### `gamification-audit`

Detectar abuso de:

* XP;
* pontos;
* moedas;
* reputação;
* achievements;
* streaks;
* likes;
* reactions;
* referrals.

Modelo:

```text
TRIGGER
↓
CONDITION
↓
REWARD
↓
REVERSAL
```

Sempre testar:

```text
ACTION
→ REWARD
→ REVERSE
→ ACTION
→ REWARD
```

Também considerar:

```text
self-reward
multi-account
replay
concurrency
automation
```

---

# 10. Fase 7 — Frontend skills

Implementar:

### `ux-review`

Avaliar:

* clareza;
* hierarquia;
* carga cognitiva;
* feedback;
* affordances;
* consistência;
* navegação;
* estados vazios;
* erros;
* loading.

---

### `visual-quality-review`

Avaliar:

* tipografia;
* spacing;
* hierarchy;
* density;
* contrast;
* composition;
* consistency;
* visual noise;
* generic AI patterns.

Também detectar **AI slop**.

---

### `interaction-design`

Avaliar:

* hover;
* focus;
* pressed;
* disabled;
* loading;
* transitions;
* feedback;
* micro-interactions.

---

### `animation-review`

Avaliar:

* propósito;
* timing;
* easing;
* hierarchy;
* continuity;
* interruption;
* accessibility;
* reduced motion.

---

### `accessibility-review`

Avaliar:

* keyboard;
* screen readers;
* focus;
* semantic HTML;
* contrast;
* touch targets;
* reduced motion;
* forms;
* errors.

---

# 11. Fase 8 — Reference system

Criar um catálogo centralizado:

```text
references/
├── frontend.yaml
├── ux.yaml
├── engineering.yaml
├── security.yaml
├── product.yaml
└── research.yaml
```

Cada entrada:

```yaml
- name: Example
  url: https://example.com
  type: methodology
  category: ux

  authority: established

  use_when:
    - reviewing usability
    - designing flows

  avoid_when:
    - unrelated backend task

  search_queries:
    - "..."
    - "..."
```

---

# 12. Fase 9 — Frontend reference catalog

Inicialmente adicionar referências como:

```yaml
ux:
  - Laws of UX
  - Interfaces

visual:
  - Impeccable
  - Impeccable Slop
  - Dark.design

inspiration:
  - Dribbble

implementation:
  - Animate UI

discovery:
  - LazyWeb
  - Shoogle
```

URLs:

```text
https://lawsofux.com/
https://impeccable.style/
https://impeccable.style/slop/
https://interfaces.rauno.me/
https://www.lazyweb.com/
https://shoogle.dev/
https://dribbble.com/
https://www.dark.design/
https://animate-ui.com/
```

Essas fontes devem ser tratadas como diferentes classes de conhecimento:

```text
methodology
heuristic
inspiration
implementation
discovery
```

Não tratar todas como igualmente confiáveis.

---

# 13. Fase 10 — Research skills

Criar:

### `reference-research`

Descobrir quais fontes externas são relevantes para a tarefa.

---

### `github-reference-research`

Pesquisar:

```text
feature implementation
feature architecture
feature database
feature API
feature framework
```

Avaliar:

* atividade;
* qualidade;
* testes;
* documentação;
* adoção;
* licença;
* arquitetura.

Extrair ideias, não copiar cegamente.

---

### `market-research`

Pesquisar produtos reais.

Comparar:

* UX;
* onboarding;
* navigation;
* information architecture;
* interaction;
* empty states;
* errors;
* mobile;
* terminology.

A pergunta não deve ser:

> "Qual é o design mais bonito?"

Mas:

> "Como produtos que resolveram esse problema em escala fazem isso?"

---

### `implementation-research`

Pesquisar como problemas técnicos específicos são resolvidos na prática.

Fontes prioritárias:

```text
official documentation
GitHub
maintainer discussions
production code
technical articles
```

---

# 14. Fase 11 — Skill router

Criar:

```text
skills/meta/skill-router/SKILL.md
```

O router deve analisar a tarefa e selecionar skills.

Exemplo:

```text
"Adicionar reações que dão XP"

        ↓

gamification-audit
business-logic-audit
idempotency-audit
race-condition-hunter
api-abuse-audit
user-flow-audit
```

Outro exemplo:

```text
"Melhorar a tela de criação de personagem"

        ↓

ux-review
visual-quality-review
interaction-design
accessibility-review
reference-research
market-research
```

---

# 15. Fase 12 — Research router

O research router decide **onde pesquisar**.

Exemplo:

```text
Animation problem
        ↓
Animate UI
Impeccable
Interfaces
GitHub
real products
```

```text
UX problem
        ↓
Laws of UX
Interfaces
real products
design systems
```

```text
Architecture problem
        ↓
GitHub
official documentation
production implementations
technical literature
```

---

# 16. Fase 13 — Research before implementation

Para tarefas não triviais, o agente deverá fazer:

```text
UNDERSTAND
    ↓
CLASSIFY
    ↓
RESEARCH
    ↓
COMPARE
    ↓
DECIDE
    ↓
IMPLEMENT
```

Não:

```text
UNDERSTAND
    ↓
IMPLEMENT
```

Mas pesquisa deve ser proporcional à complexidade.

Um botão simples não precisa de pesquisa.

Uma arquitetura nova provavelmente precisa.

---

# 17. Fase 14 — Research synthesis

O agente nunca deve retornar apenas uma lista de links.

Formato:

```markdown
## Research

### Reference

[Name]

### Relevant Pattern

What was found.

### Why It Matters

Why this pattern is useful.

### Adaptation

How it could apply to the current project.

### Trade-offs

What problems it introduces.

### Recommendation

What should actually be adopted.
```

---

# 18. Fase 15 — Audit workflow

O workflow completo deverá ser:

```text
┌──────────────────────┐
│       REQUEST        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│     UNDERSTAND       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    CLASSIFY TASK     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│     SKILL ROUTER     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   RESEARCH ROUTER    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│      RESEARCH        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       ANALYZE        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       IMPLEMENT      │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   ADVERSARIAL TEST   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       VERIFY         │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       REPORT         │
└──────────────────────┘
```

---

# 19. Fase 16 — Report templates

Criar templates para:

```text
audit-report.md
bug-report.md
design-review.md
research-report.md
```

Todo finding deve conter:

```text
Severity
Confidence
Affected component
Affected flow
Reproduction
Expected behavior
Actual behavior
Root cause
Impact
Recommendation
```

---

# 20. Fase 17 — Examples

Criar exemplos concretos.

### `xp-reward-loop.md`

Demonstrar:

```text
reaction
→ XP
→ remove reaction
→ reaction
→ XP
→ infinite farming
```

---

### `race-condition.md`

Demonstrar:

```text
check balance
→ two requests
→ both pass
→ both deduct
```

---

### `authorization-bypass.md`

Demonstrar:

```text
GET /resource/123

authenticated ≠ authorized
```

---

### `frontend-review.md`

Demonstrar uma análise usando:

```text
UX
+
visual quality
+
interaction
+
accessibility
+
external references
```

---

# 21. Fase 18 — Qualidade das skills

Toda nova skill deverá responder:

### Necessidade

Qual problema ela resolve?

### Escopo

Quando deve ser ativada?

### Heurísticas

Quais perguntas ela ensina?

### Evidência

Como confirmar o finding?

### Falsos positivos

Quando o comportamento é aceitável?

### Composição

Quais outras skills normalmente trabalham junto?

---

# 22. Fase 19 — Composição entre skills

Skills devem poder trabalhar em conjunto.

Exemplo:

```text
payment
```

ativa:

```text
business-logic-audit
idempotency-audit
race-condition-hunter
data-integrity-audit
error-flow-audit
authorization-audit
```

Outro:

```text
social reactions
```

ativa:

```text
gamification-audit
business-logic-audit
idempotency-audit
race-condition-hunter
api-abuse-audit
```

---

# 23. Fase 20 — Evitar overengineering

O sistema deve evitar:

* pesquisar tudo sempre;
* executar todas as skills;
* produzir relatórios gigantes;
* consultar referências irrelevantes;
* transformar qualquer comportamento estranho em bug;
* adicionar dependências desnecessárias.

Princípio:

> **Research proportional to uncertainty and impact.**

Quanto maior:

```text
uncertainty
+
impact
+
irreversibility
```

maior deve ser o nível de pesquisa.

---

# 24. Fase 21 — Futuras extensões

Depois da primeira versão:

```text
financial/
├── payment-flow-audit/
├── pricing-manipulation/
└── refund-abuse/

architecture/
├── dependency-audit/
├── boundary-audit/
└── failure-domain-audit/

performance/
├── query-audit/
├── caching-audit/
└── frontend-performance/

observability/
├── logging-audit/
├── monitoring-audit/
└── incident-debugging/

mobile/
├── mobile-ux-review/
└── offline-state-audit/
```

---

# 25. Definition of Done

O projeto será considerado funcional quando:

* [ ] `AGENTS.md` estiver completo.
* [ ] O formato padrão de `SKILL.md` estiver definido.
* [ ] As skills core estiverem implementadas.
* [ ] As skills de segurança estiverem implementadas.
* [ ] As skills de reliability estiverem implementadas.
* [ ] As skills frontend estiverem implementadas.
* [ ] O catálogo de referências existir.
* [ ] O catálogo possuir categorias e autoridade.
* [ ] GitHub estiver integrado ao processo de research.
* [ ] Market research estiver definido.
* [ ] Skill router estiver implementado.
* [ ] Research router estiver implementado.
* [ ] Templates de relatório existirem.
* [ ] Exemplos reais existirem.
* [ ] As skills puderem ser combinadas.
* [ ] O agente souber distinguir evidência de especulação.
* [ ] O agente pesquisar antes de reinventar soluções complexas.

---

# 26. Primeira versão

A primeira release não precisa ter centenas de skills.

### Core

```text
adversarial-review
user-flow-audit
business-logic-audit
edge-case-hunter
state-consistency-audit
error-flow-audit
```

### Security

```text
authorization-audit
api-abuse-audit
input-trust-audit
```

### Reliability

```text
race-condition-hunter
idempotency-audit
data-integrity-audit
```

### Product

```text
gamification-audit
```

### Frontend

```text
ux-review
visual-quality-review
interaction-design
animation-review
accessibility-review
```

### Research

```text
reference-research
github-reference-research
market-research
implementation-research
```

### Meta

```text
skill-router
research-router
```

Total inicial:

**24 skills.**

A prioridade deve ser qualidade, composição e capacidade de raciocínio — não quantidade.

---

# 27. Visão final

O projeto deve funcionar como uma camada de inteligência sobre agentes de desenvolvimento:

```text
                    AGENT
                      │
                      ↓
                SKILL ROUTER
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       AUDIT       PRODUCT     FRONTEND
          │           │           │
          └───────────┼───────────┘
                      ↓
               RESEARCH ROUTER
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
      GitHub       Products      References
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                  SYNTHESIS
                      │
                      ↓
                 IMPLEMENT
                      │
                      ↓
              ADVERSARIAL TEST
                      │
                      ↓
                   VERIFY
                      │
                      ↓
                   REPORT
```

O objetivo final não é criar um agente que **sabe mais**.

É criar um agente que **sabe como descobrir mais, onde procurar, quais perguntas fazer e como verificar se está certo**.
