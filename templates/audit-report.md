# Audit Report Template

Template para relatórios de auditoria. Toda skill de auditoria produz findings neste
formato. Copie este template e preencha. Ver `AGENTS.md` § 2 para a escala de evidência
e `docs/skill-authoring.md` para a estrutura de skills.

---

# Audit Report — <target>

**Date:** <YYYY-MM-DD>
**Target:** <system / component / feature audited>
**Scope:** <what was in scope; what was explicitly out of scope>
**Skills used:** <comma-separated skill names, e.g. adversarial-review, business-logic-audit>
**References consulted:** <names from references/*.yaml, or "none">

## Summary

<1–3 paragraphs. Número total de findings por severidade. As 2–3 conclusões mais
importantes. Não listar todos os findings aqui — apenas o que um humano precisa saber
primeiro.>

### Findings by severity

| Severity | Count |
|---|---|
| Critical | <n> |
| High | <n> |
| Medium | <n> |
| Low | <n> |

### Findings by confidence

| Confidence | Count |
|---|---|
| CONFIRMED | <n> |
| HIGH CONFIDENCE | <n> |
| POSSIBLE | <n> |
| SPECULATIVE | <n> |

> Findings `SPECULATIVE` são riscos a verificar, **não** bugs confirmados. Não devem
> bloquear implementação.

---

## Findings

### Finding 1 — <short title>

| Field | Value |
|---|---|
| **Severity** | Critical \| High \| Medium \| Low |
| **Confidence** | CONFIRMED \| HIGH CONFIDENCE \| POSSIBLE \| SPECULATIVE |
| **Affected component** | <file(s) / module(s) / endpoint(s)> |
| **Affected flow** | <the user or system flow this breaks> |
| **Reproduction** | <step-by-step, or request sequence; concrete enough to redo> |
| **Expected behavior** | <what should happen> |
| **Actual behavior** | <what does happen> |
| **Root cause** | <the mechanism — why it happens, not just that it does> |
| **Impact** | <what an attacker or user can achieve; blast radius> |
| **Recommendation** | <concrete fix; where to enforce it (server, DB, both)> |

**Evidence:** <logs, test output, request/response, or "no reproduction yet — reasoning only". Link or paste.>

**False-positive check:** <why this is NOT an acceptable/intended behavior — or "considered: <X>; ruled out because <Y>". If you cannot rule it out, lower confidence.>

---

### Finding 2 — <short title>

<repeat the block above for each finding>

---

## Deduplication note

<Se múltiplas skills apontaram o mesmo defeito, registre aqui quais foram consolidadas
em um único finding e por quê. Se nenhuma sobreposição, escreva "No overlapping findings
across skills.">

## Out of scope / not investigated

<Quais áreas foram deixadas de fora e por quê — para que um leitor saiba o que NÃO foi
verificado. Honestidade sobre limites é parte do relatório.>

## Next steps

<Ordenado por prioridade. Quais findings exigem ação imediata, quais são riscos a
monitorar, quais precisam de mais investigação para subir de POSSIBLE para CONFIRMED.>
