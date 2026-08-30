<p align="center">
  <img width="350" alt="Ornn Forge" src="https://github.com/user-attachments/assets/74d45b30-994d-4717-a7ff-5be2d57c2335" />
</p>


<p align="center">
  <img src="https://img.shields.io/npm/v/ornn-forge?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/ornn-forge?style=flat-square" alt="npm downloads" />
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square" alt="zero dependencies" />
  <img src="https://img.shields.io/github/license/1arley/1arley-agent-skills?style=flat-square" alt="MIT license" />
</p>

# Agent Engineering Skills

> **Don't just review the code. Attack the assumptions behind the system.**

Um repositório de skills modulares que ensinam agentes de IA a **entender → pesquisar → questionar → testar → verificar → implementar → revisar**.

O objetivo não é criar um agente que sabe mais. É criar um agente que **sabe como descobrir mais, onde procurar, quais perguntas fazer e como verificar se está certo**.

- 🛠️ **25 skills** prontas para instalar no Claude Code (auditoria, segurança, reliability, produto, frontend, pesquisa)
- 🧠 Skills ensinam **como pensar** — modelo mental, perguntas, padrões de ataque, evidência — não listas de comandos
- 📚 Referências centralizadas em `references/*.yaml` ensinam **onde olhar**, com nível de autoridade
- 🧭 Dois routers (`skill-router`, `research-router`) que despacham a tarefa para as skills e fontes certas
- ✅ Validador embutido que garante que o repositório nunca vire uma pasta de prompts desconexos
- 📦 Zero dependências, instalável com um comando `npx`

---

## Índice

- [Instalação](#instalação)
- [Como usar](#como-usar)
- [O que isto é](#o-que-isto-é)
- [Estrutura](#estrutura)
- [As 25 skills](#as-25-skills)
- [Workflow completo](#workflow-completo)
- [Validação](#validação)
- [Documentação](#documentação)
- [Licença](#licença)

---

## Instalação

### Instalação interativa (recomendada)

```bash
npx ornn-forge install
```

O instalador detecta automaticamente os destinos com evidência (diretório de
skills já existente ou binário no PATH) e abre uma interface interativa:

```text
Agent Engineering Skills v1.0.1

Where do you want to install?

  ● Current project
  ○ Globally

Select destinations:

  ☑ Claude Code — .claude/skills (✓ configured)
  ☑ OpenCode — .opencode/skills (✓ configured)
  ☐ Cursor — .cursor/skills (○ not detected)
  ☑ Universal Agent Skills — .agents/skills (always available)
  ☐ Custom directory (enter a path)

25 skills will be installed.

Continue? Y/n
```

Destinos com evidência começam selecionados; Universal e Custom directory estão
sempre disponíveis, então a instalação nunca depende de uma lista fixa.

Após a confirmação, cada destino recebe as skills com o adapter correto:

```text
Installing Agent Engineering Skills

✓ Claude Code          .claude/skills        25 skills
✓ OpenCode             .opencode/skills      25 skills
✓ Universal Agent Skills  .agents/skills     25 skills

Done. 3 destination(s) configured.
```

### Instalação não interativa (CI/scripts)

```bash
# Universal: instala em .agents/skills (formato Agent Skills puro)
npx ornn-forge install --universal --yes

# Provider específico
npx ornn-forge install --providers claude --yes

# Vários providers
npx ornn-forge install --providers claude,codex,opencode --yes

# Escopo global
npx ornn-forge install --scope global --providers claude --yes

# Dry-run (preview sem alterar nada)
npx ornn-forge install --scope project --providers detected --dry-run

# Todos os providers
npx ornn-forge install --providers all --scope project --dry-run
```

### Outros comandos

```bash
npx ornn-forge update              # atualiza skills instaladas via manifesto
npx ornn-forge uninstall           # remove skills gerenciadas
npx ornn-forge validate            # validador (contratos + catálogo + evals)
npx ornn-forge doctor              # diagnóstico de providers e instalações
npx ornn-forge list                # lista skills do catálogo e instalações
npx ornn-forge graph               # grafo Mermaid da composição
npx ornn-forge eval --json         # evals determinísticos de routing
npx ornn-forge --help              # ajuda completa
npx ornn-forge --version           # versão instalada
```

### Aliases

```bash
-g              --scope global
-y              --yes
-a              --providers
```

### Instalação segura

```bash
npx ornn-forge install --dry-run   # mostra o que aconteceria, sem escrever nada
npx ornn-forge install --force     # sobrescreve skills, com guardrails de path
```

### Instalação legada (compatibilidade)

```bash
# Instala no diretório informado, adaptando frontmatter para Claude Code
npx ornn-forge install --target ~/meus-skills

# Symlinks para desenvolvimento
npx ornn-forge install --link
```

### Opção 2 — clonando o repositório

```bash
git clone https://github.com/1arley/1arley-agent-skills.git
cd 1arley-agent-skills
python3 scripts/validate.py   # verifica que tudo está íntegro
```

As skills ficam em `skills/<categoria>/<nome>/SKILL.md` e você pode copiá-las ou
referenciá-las manualmente no seu harness de agente.

---

## Como usar

### Passo 1 — Leia as regras globais

`AGENTS.md` define o comportamento base do agente: investigar antes de concluir,
pensar em invariantes, testar repetição/reversão/concorrência, não confiar no frontend,
classificar evidência (`CONFIRMED` → `SPECULATIVE`), e pesquisar antes de reinventar.

### Passo 2 — Comece pelo router

Para qualquer tarefa não-trivial, comece pelo **`skill-router`** — ele analisa a
tarefa e seleciona quais skills ativar:

```text
"Adicionar reações que dão XP"
        ↓
gamification-audit → business-logic-audit → idempotency-audit
→ race-condition-hunter → api-abuse-audit → user-flow-audit
```

```text
"Melhorar a tela de criação de personagem"
        ↓
ux-review → visual-quality-review → interaction-design
→ accessibility-review → reference-research → market-research
```

### Passo 3 — Leia o SKILL.md da skill selecionada

Cada skill segue o mesmo formato de 9 seções:

| Seção | O que contém |
|---|---|
| **Objective** | O que a skill ensina o agente a fazer |
| **When to Use** | Quando ativá-la (e com quais outras skills compõe) |
| **Mental Model** | A lente de raciocínio — como enxergar o sistema |
| **Investigation Procedure** | A ordem da investigação |
| **Questions to Ask** | Perguntas concretas que expõem defeitos |
| **Attack Patterns** | Sequências de operações que atacam suposições |
| **Evidence Requirements** | O que conta como confirmação |
| **False Positives** | Quando o comportamento estranho é aceitável |
| **Output Format** | Como reportar findings |

### Passo 4 — Pesquise antes de reinventar

Para tarefas não-triviais, o **`research-router`** decide onde pesquisar:

```text
Animation problem    → Animate UI, Impeccable, Interfaces, GitHub, real products
UX problem           → Laws of UX, Interfaces, real products, design systems
Architecture problem → GitHub, official docs, production implementations, technical literature
Security problem     → OWASP, PortSwigger, CWE, GitHub
```

Toda pesquisa é sintetizada (Reference → Relevant Pattern → Why It Matters → Adaptation
→ Trade-offs → Recommendation) — **nunca** apenas uma lista de links.

### Passo 5 — Reporte com evidência

Use `templates/audit-report.md` (ou os outros templates) e classifique cada finding:

```text
CONFIRMED         — reproduzido com evidência direta
HIGH CONFIDENCE   — forte indício técnico, sem reprodução
POSSIBLE          — plausível, exige investigação
SPECULATIVE       — hipótese sem evidência → risco a verificar, não bug
```

**Quer ver um exemplo concreto?** Leia um dos 4 exemplos em `examples/` de ponta a
ponta — cada um é uma auditoria completa (farming de XP, race condition, bypass de
autorização, revisão de frontend) que demonstra o fluxo inteiro.

---

## O que isto é

Três camadas, separadas de propósito:

```text
skills/        →  como pensar   (modelo mental, perguntas, padrões de ataque, evidência)
knowledge/     →  o que considerar
references/    →  onde pesquisar (catálogo centralizado de fontes externas)
```

As skills ensinam raciocínio. As referências ensinam onde olhar. Nenhuma skill depende
de conhecimento implícito que não esteja documentado ou disponível através das
referências.

---

## Estrutura

```text
├── AGENTS.md              # regras globais do agente
├── plan.md                # especificação completa (fases, formato, definição de pronto)
├── LICENSE                # MIT
├── package.json           # npm (npx ornn-forge install)
│
├── skills/
│   ├── audit/             # auditoria de sistemas e descoberta de bugs
│   ├── security/          # autorização, abuso de API, confiança de input
│   ├── reliability/       # race conditions, idempotência, integridade de dados
│   ├── product/           # regras de negócio e gamificação
│   ├── frontend/          # UX, visual, interação, animação, acessibilidade
│   ├── research/          # descoberta de referências e implementações
│   └── meta/              # routers que despacham para skills e fontes
│
├── references/            # catálogo YAML de fontes externas (6 catálogos)
├── knowledge/             # material "o que considerar" (estrutura pronta)
├── catalog/               # single source of truth para routing (skills.yaml)
├── evals/                 # casos, fixtures, baselines e resultados
├── templates/             # templates de relatório (audit, bug, design, research)
├── examples/              # exemplos concretos de auditorias completas
├── docs/                  # filosofia, authoring, integração
├── test/                  # testes unitários (node:test + unittest)
├── bin/                   # CLI (node, zero deps)
├── src/installer/         # provider registry, detecção, adapters, manifest
├── .github/workflows/     # CI, reference health e release gates
└── scripts/               # validação, router, eval, findings, health checks
```

---

## As 25 skills

### Core audit

| Skill | Descrição |
|---|---|
| `adversarial-review` | Ataca o sistema como usuário curioso, malicioso, power user, descuidado, concorrente e com estado antigo; opera repeat, reverse, reorder, skip, replay, concurrent, manipulate |
| `user-flow-audit` | Mapeia entry → preconditions → action → state change → feedback → next state; acha dead ends, estados impossíveis, passos puláveis, refresh/back-button problems, operações duplicadas |
| `business-logic-audit` | Identifica regras, invariants, limites, ownership, transições e rewards; para cada regra: where enforced? bypassable? repeatable? reversible? raced? |
| `edge-case-hunter` | Gera casos de fronteira: null, empty, zero, negative, huge, duplicates, Unicode, stale, deleted, expired, repeated actions |
| `state-consistency-audit` | Compara estado entre database, API, server state, cache, client state e URL state; procura divergências |
| `error-flow-audit` | Investiga partial success, timeouts, lost responses, retries, crashes, rollback failures — estados deixados inconsistentes |

### Security

| Skill | Descrição |
|---|---|
| `authorization-audit` | Separa authenticated de authorized; verifica ownership, moderator, admin, participant — no servidor, sempre |
| `api-abuse-audit` | Trata a API como diretamente acessível: repetição, replay, manipulação de IDs, campos extras, endpoints alternativos, rate limiting, bypass de UI |
| `input-trust-audit` | Identifica valores que nunca devem ser confiados ao cliente: userId, role, price, XP, permissions, ownership, status, reward, timestamps |
| `security-audit` | Auditoria adaptativa à stack: detecta a stack, varre as 5 classes (isolamento de tenant, gate só no navegador, IDOR, segredos hardcoded, XSS) com evidência arquivo:linha e gera relatório + issues |

### Reliability

| Skill | Descrição |
|---|---|
| `race-condition-hunter` | Procura READ → DECISION → WRITE e pergunta: o que acontece se outro request modificar o estado entre as operações? |
| `idempotency-audit` | Testa request ×N e response-lost + retry; especialmente em pagamentos, rewards, criação, webhooks, notificações, contadores |
| `data-integrity-audit` | Verifica unique constraints, foreign keys, transactions, cascading, soft delete, enums — o banco deve impedir estados impossíveis |

### Product

| Skill | Descrição |
|---|---|
| `gamification-audit` | Detecta abuso de XP, pontos, moedas, reputação, achievements, streaks, likes, reactions, referrals; modelo TRIGGER → CONDITION → REWARD → REVERSAL |

### Frontend

| Skill | Descrição |
|---|---|
| `ux-review` | Avalia clareza, hierarquia, carga cognitiva, feedback, affordances, consistência, navegação, estados vazios, erros, loading |
| `visual-quality-review` | Avalia tipografia, spacing, hierarchy, density, contrast, composition, consistency, visual noise — e detecta **AI slop** |
| `interaction-design` | Avalia hover, focus, pressed, disabled, loading, transitions, feedback, micro-interactions |
| `animation-review` | Avalia propósito, timing, easing, hierarchy, continuity, interruption, accessibility, reduced motion |
| `accessibility-review` | Avalia keyboard, screen readers, focus, semantic HTML, contrast, touch targets, reduced motion, forms, errors (WCAG) |

### Research

| Skill | Descrição |
|---|---|
| `reference-research` | Descobre quais fontes externas do catálogo são relevantes e sintetiza em padrões acionáveis |
| `github-reference-research` | Pesquisa implementações reais no GitHub (implementation, architecture, database, API, framework) e avalia atividade, qualidade, testes, docs, adoção, licença |
| `market-research` | Pesquisa produtos reais em escala — "como produtos que resolveram esse problema em escala fazem isso?" |
| `implementation-research` | Resolve problemas técnicos específicos priorizando: official docs → GitHub → maintainer discussions → production code → articles |

### Meta (routers)

| Skill | Descrição |
|---|---|
| `skill-router` | Analisa a tarefa e seleciona quais skills ativar (com tabelas de composição) |
| `research-router` | Decide onde pesquisar com base no tipo de problema (animation, UX, architecture, security, implementation...) |

> A prioridade é **qualidade, composição e capacidade de raciocínio — não quantidade**.
> Cada skill segue o mesmo formato padrão de 9 seções — ver `docs/skill-authoring.md`.

---

## Workflow completo

```text
REQUEST → UNDERSTAND → CLASSIFY → SKILL ROUTER → RESEARCH ROUTER →
RESEARCH → ANALYZE → IMPLEMENT → ADVERSARIAL TEST → VERIFY → REPORT
```

Pesquisa é proporcional à complexidade: um botão simples não precisa de pesquisa;
uma arquitetura nova provavelmente precisa; concorrência em pagamentos certamente.

---

## Validação

O repositório inclui um validador que garante que as skills seguem o formato padrão,
que as referências seguem o schema, e que o router referencia skills que existem:

```bash
# Pelo npx
npx ornn-forge validate

# Ou direto no repositório
python3 scripts/validate.py
```

**Saída esperada (íntegra):**

```
Skills found:      25
Reference catalogs: 6
Errors:             0
Warnings:           0

✓ All contracts satisfied.
```

---

## Documentação

* `docs/philosophy.md` — princípios e filosofia central.
* `docs/skill-authoring.md` — como escrever uma skill (formato `SKILL.md`).
* `docs/reference-authoring.md` — como adicionar referências (schema YAML).
* `docs/agent-integration.md` — como o agente integra skills, routers e workflows.
* `docs/architecture.md` — arquitetura do sistema (pipeline, camadas, trust boundaries).
* `docs/routing.md` — catálogo, scoring, budget, overlap e composição.
* `docs/evals.md` — formato, métricas, gates e como interpretar regressão.
* `docs/compatibility.md` — matriz de compatibilidade Agent Skills.
* `docs/contributing-skills.md` — contrato para novas skills.
* `docs/release-process.md` — versionamento e release gate.
* `CONTRIBUTING.md` — como contribuir.
* `SECURITY.md` — como reportar vulnerabilidades.
* `CHANGELOG.md` — histórico de mudanças.
* `plan.md` — especificação completa e Definition of Done.

---

## Licença

MIT — ver `LICENSE`.

---

<p align="center">
  <sub>Feito com o propósito de ensinar agentes a descobrir mais, procurar melhor, fazer as perguntas certas e verificar se estão certos.</sub>
</p>
