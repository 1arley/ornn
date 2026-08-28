# Agent Engineering Skills

> **Don't just review the code. Attack the assumptions behind the system.**

Um repositório de skills modulares que ensinam agentes de IA a **entender → pesquisar
→ questionar → testar → verificar → implementar → revisar**.

O objetivo não é criar um agente que sabe mais.
É criar um agente que **sabe como descobrir mais, onde procurar, quais perguntas fazer
e como verificar se está certo**.

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

## Estrutura

```text
├── AGENTS.md              # regras globais do agente
├── plan.md                # especificação completa (fases, formato, definição de pronto)
├── LICENSE                # MIT
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
├── references/            # catálogo YAML de fontes externas
├── knowledge/             # material "o que considerar"
├── templates/             # templates de relatório (audit, bug, design, research)
├── examples/              # exemplos concretos de auditorias
├── docs/                  # filosofia, authoring, integração
└── scripts/               # validação (lint de skills e referências)
```

Cada skill é `skills/<categoria>/<nome>/SKILL.md` com frontmatter YAML e nove seções
fixas. Ver `docs/skill-authoring.md`.

## Skills (primeira versão — 24)

| Categoria | Skills |
|---|---|
| **Core audit** | `adversarial-review`, `user-flow-audit`, `business-logic-audit`, `edge-case-hunter`, `state-consistency-audit`, `error-flow-audit` |
| **Security** | `authorization-audit`, `api-abuse-audit`, `input-trust-audit` |
| **Reliability** | `race-condition-hunter`, `idempotency-audit`, `data-integrity-audit` |
| **Product** | `gamification-audit` |
| **Frontend** | `ux-review`, `visual-quality-review`, `interaction-design`, `animation-review`, `accessibility-review` |
| **Research** | `reference-research`, `github-reference-research`, `market-research`, `implementation-research` |
| **Meta** | `skill-router`, `research-router` |

A prioridade é **qualidade, composição e capacidade de raciocínio — não quantidade**.

## Como usar

1. Leia `AGENTS.md` para as regras globais.
2. Para uma tarefa, comece pelo `skills/meta/skill-router/` — ele seleciona quais
   skills ativar com base no tipo de tarefa.
3. Para pesquisa, use `skills/meta/research-router/` — ele aponta quais fontes em
   `references/` consultar.
4. Ao reportar findings, siga `templates/audit-report.md` e classifique cada um por
   nível de evidência (`CONFIRMED` / `HIGH CONFIDENCE` / `POSSIBLE` / `SPECULATIVE`).

## Workflow completo

```text
REQUEST → UNDERSTAND → CLASSIFY → SKILL ROUTER → RESEARCH ROUTER →
RESEARCH → ANALYZE → IMPLEMENT → ADVERSARIAL TEST → VERIFY → REPORT
```

Pesquisa é proporcional à complexidade: um botão simples não precisa de pesquisa;
uma arquitetura nova provavelmente precisa; concorrência em pagamentos certamente.

## Status

**Primeira versão completa.** 24 skills implementadas, 6 catálogos de referências,
4 templates de relatório, 4 exemplos concretos, 2 meta routers, validador.

```bash
python3 scripts/validate.py
```

Verifica que toda `skills/**/SKILL.md` tem o frontmatter e as nove seções exigidas,
que toda `references/*.yaml` segue o schema de catálogo, e que as referências do
`skill-router` são consistentes. Ver `docs/skill-authoring.md` e
`docs/reference-authoring.md`.

## Documentação

* `docs/philosophy.md` — princípios e filosofia central.
* `docs/skill-authoring.md` — como escrever uma skill (formato `SKILL.md`).
* `docs/reference-authoring.md` — como adicionar referências (schema YAML).
* `docs/agent-integration.md` — como o agente integra skills, routers e workflows.
* `plan.md` — especificação completa e Definition of Done.

## Licença

MIT — ver `LICENSE`.
