---
name: skill-router
description: Analyzes a task and selects which audit, security, reliability, product, frontend, and research skills to activate, with composition tables mapping task phrases to ordered skill sets.
category: meta
triggers:
  - "which skills should I run"
  - "route a task to skills"
  - "select skills for an audit"
  - "compose skills for a feature"
  - "start an audit"
priority: high
---

# Skill Router

## Objective

Analisar uma tarefa e **selecionar quais skills ativar**. Nem toda tarefa precisa de
todas as skills. O router é a camada de despacho: lê o pedido, classifica, e retorna um
conjunto ordenado de skills a executar. É a porta de entrada do workflow de auditoria
(ver `AGENTS.md` § 4).

## When to Use

* No início de qualquer auditoria ou revisão não-trivial — é o estágio "SKILL ROUTER"
  do workflow.
* Quando você precisa decidir *quais* skills aplicar a um pedido vago ("audit this
  feature").
* Para composição — combinar skills que se complementam.
* **Composição:** o router *é* a composição. Ele referencia todas as outras skills e
  despacha para elas. Não há skill "abaixo" dele; há as skills que ele seleciona.

## Mental Model

O router usa três sinais para despachar:

1. **Categoria do problema** — lógica/estado vs UX/visual vs pesquisa vs segurança vs
   confiabilidade.
2. **Palavras-gatilho** — mapeadas aos `triggers` de cada skill.
3. **Risco/impacto** — fluxos com valor transferível (pagamento, recompensa, permissão)
   ativam mais skills; UI cosmética ativa menos.

Princípio de **proporcionalidade** (ver `AGENTS.md` § 6): não ative todas as skills por
default. Uma mudança trivial e reversível não precisa de auditoria completa; uma mudança
em fluxo de pagamento, irreversível e de alto impacto, justifica o conjunto máximo.

O router **não** executa as skills — ele só seleciona e ordena. A ordem importa: skills
que geram hipóteses (ex: `adversarial-review`) vêm antes das que confirmam (ex:
`race-condition-hunter`, `idempotency-audit`). Skills de frontend/research vêm depois
das de lógica quando o problema é misto.

## Investigation Procedure

1. **UNDERSTAND** — reformule o pedido em uma frase precisa: qual sistema/fluxo, qual
   mudança ou risco.
2. **CLASSIFY** — determine a categoria dominante (audit / security / reliability /
   product / frontend / research) e se há valor transferível, estado compartilhado, ou
   permissões envolvidas.
3. **MATCH triggers** — compare o pedido com os `triggers` de cada skill (listados no
   frontmatter de cada `SKILL.md`).
4. **APPLY a tabela de composição** abaixo para o conjunto base, depois ajuste pelos
   sinais específicos.
5. **ORDENE** — hipóteses primeiro, confirmação depois; lógica antes de visual quando
   misto.
6. **JUSTifique a seleção** — diga quais skills e por quê, e quais *não* foram
   selecionadas e por quê (evita overengineering e mostra cobertura).
7. **Despache** — entregue a lista ordenada; o executor roda cada skill e deduplica
   findings.

## Questions to Ask

* Qual é a categoria dominante do problema?
* Há valor transferível (dinheiro, XP, moeda, estoque)? → ativa lógica + reliability.
* Há permissões/ownership? → ativa security.
* Há estado compartilhado ou concorrência? → ativa reliability.
* Há UI/visual envolvido? → ativa frontend.
* Preciso pesquisar referências antes de concluir? → ativa research (via
  `research-router`).
* O risco/impacto justifica o conjunto completo, ou um subconjunto basta?

## Attack Patterns

O router não "ataca", mas despacha. Os padrões de composição são a sua saída:

```text
"Adicionar reações que dão XP"
        ↓
gamification-audit
business-logic-audit
idempotency-audit
race-condition-hunter
api-abuse-audit
user-flow-audit

"Melhorar a tela de criação de personagem"
        ↓
ux-review
visual-quality-review
interaction-design
accessibility-review
reference-research
market-research

"payment"
        ↓
business-logic-audit
idempotency-audit
race-condition-hunter
data-integrity-audit
error-flow-audit
authorization-audit

"social reactions"
        ↓
gamification-audit
business-logic-audit
idempotency-audit
race-condition-hunter
api-abuse-audit
```

### Tabela de composição por domínio

| Sinal / palavra-gatilho | Skills a ativar (ordenadas) |
|---|---|
| recompensa, XP, pontos, streak, achievement | `gamification-audit`, `business-logic-audit`, `idempotency-audit`, `race-condition-hunter`, `api-abuse-audit`, `user-flow-audit` |
| payment, cobrança, checkout, reembolso | `business-logic-audit`, `idempotency-audit`, `race-condition-hunter`, `data-integrity-audit`, `error-flow-audit`, `authorization-audit` |
| permissão, role, ownership, admin, moderator | `authorization-audit`, `input-trust-audit`, `business-logic-audit`, `api-abuse-audit` |
| API, endpoint, rate limit, bypass UI | `api-abuse-audit`, `input-trust-audit`, `authorization-audit`, `edge-case-hunter` |
| concorrência, race, simultâneo, double-spend | `race-condition-hunter`, `idempotency-audit`, `data-integrity-audit`, `business-logic-audit` |
| fluxo, onboarding, wizard, steps, dead end | `user-flow-audit`, `state-consistency-audit`, `error-flow-audit`, `edge-case-hunter` |
| erro, rollback, retry, timeout, partial | `error-flow-audit`, `idempotency-audit`, `data-integrity-audit`, `state-consistency-audit` |
| cache, stale, desync, refresh, back button | `state-consistency-audit`, `user-flow-audit`, `data-integrity-audit` |
| UX, usabilidade, fluxo de usuário, hierarquia | `ux-review`, `interaction-design`, `accessibility-review`, `reference-research` |
| visual, tipografia, spacing, AI slop | `visual-quality-review`, `ux-review`, `reference-research` |
| animação, transição, motion, reduced motion | `animation-review`, `interaction-design`, `accessibility-review` |
| acessibilidade, keyboard, screen reader, contraste | `accessibility-review`, `ux-review` |
| regra de negócio, invariant, limite, cota | `business-logic-audit`, `data-integrity-audit`, `input-trust-audit` |
| descoberta de referências, como outros fazem | `reference-research`, `market-research`, `implementation-research`, `github-reference-research` |
| auditoria genérica / "ataque o sistema" | `adversarial-review` + o subconjunto relevante acima |

### Quando ativar o conjunto mínimo vs completo

| Risco | Conjunto |
|---|---|
| trivial + reversível (botão, label, cor) | nenhum, ou só o skill de domínio único |
| médio, reversível, sem estado compartilhado | 1–2 skills do domínio |
| alto, estado compartilhado, valor transferível | conjunto completo do domínio |
| crítico, irreversível, valor transferível (pagamento, permissão) | conjunto máximo + `adversarial-review` + `research-router` |

## Evidence Requirements

O router produz uma **decisão de despacho**, não um finding. Mas a decisão deve ser
rastreável:

* **Listar as skills selecionadas** (ordenadas).
* **Citar o gatilho** que levou a cada (qual palavra/sinal do pedido matchou qual
  `trigger`).
* **Listar skills NÃO selecionadas** e por quê (fora de escopo, risco insuficiente).
* **Indicar o nível de pesquisa** (nenhuma / proporcional / completa) — conecta ao
  `research-router`.
* Se uma skill não existe no repositório, **dizer explicitamente** e marcar como gap —
  nunca inventar uma skill.

A "evidência" do router é a consistência entre o pedido, os triggers das skills, e a
tabela de composição. Se a seleção não consegue ser justificada pelos triggers, o
router errou.

## False Positives

* **Ativar tudo "por segurança"** — viola o princípio de proporcionalidade. Se o risco
  é baixo, um subconjunto basta. Overengineering é um anti-padrão (ver `AGENTS.md` § 6).
* **Despachar para skill inexistente** — o router só pode selecionar skills que existem
  em `skills/`. Verificar antes de listar.
* **Ignorar pesquisa quando o problema é novo** — para arquitetura nova ou padrão não
  trivial, omitir research é um falso negativo. Conectar ao `research-router`.
* **Duplicar findings por não ordenar** — sem ordem (hipóteses→confirmação), skills
  redundantes produzem findings sobrepostos. A ordem e a dedup downstream importam.
* **Confundir categoria** — despachar um problema de concorrência só para frontend, ou
  um problema visual só para lógica. A classificação dominante guia; os sinais
  secundários adicionam.

## Output Format

```markdown
## Skill Router — Dispatch

**Task:** <reformulação precisa>
**Dominant category:** <audit | security | reliability | product | frontend | research>
**Risk level:** <trivial | medium | high | critical>
**Research level:** <none | proportional | full>

### Selected skills (ordered)
1. <skill> — <gatilho que matchou>
2. <skill> — <gatilho>
...

### Not selected
- <skill> — <razão: fora de escopo / risco insuficiente>

### Research routing
<delegar a research-router? quais fontes? ou "none — tarefa rotineira">
```

Após o despacho, o executor roda cada skill na ordem e consolida findings via
`templates/audit-report.md`, deduplicando sobreposições (ver `AGENTS.md` § 7).
