# Design Review Template

Template para revisões de design de frontend (UX + visual + interação + animação +
acessibilidade + referências externas). Consolida a saída das skills de frontend em um
relatório único, com síntese de pesquisa quando aplicável.

---

# Design Review — <screen / flow>

**Date:** <YYYY-MM-DD>
**Target:** <tela/fluxo/componente revisado>
**Skills used:** <ex: ux-review, visual-quality-review, interaction-design,
animation-review, accessibility-review>
**References consulted:** <fontes de references/frontend.yaml + ux.yaml usadas>

## Executive summary

<2-3 parágrafos. O que está bom, o que está quebrado, e o que deve ser corrigido antes
de lançar. Prioridade geral (ship / ship-with-fixes / fix-first).>

## Verdict

| **Ship** | **Ship with fixes** | **Fix first** |
|---|---|---|

## Dimensions

Para cada dimensão, um veredicto resumido + pointer para os findings detalhados:

| Dimension | Verdict | Findings |
|---|---|---|
| UX (clareza, hierarquia, carga cognitiva, feedback, affordances, consistência, navegação, empty states, erros, loading) | ✅ / ⚠️ / ❌ | #F1..F5 |
| Visual (tipografia, spacing, hierarchy, density, contrast, composition, noise, AI slop) | ✅ / ⚠️ / ❌ | #F6..F8 |
| Interaction (hover, focus, pressed, disabled, loading, transitions, feedback, micro-interactions) | ✅ / ⚠️ / ❌ | #F9..F10 |
| Animation (propósito, timing, easing, hierarchy, continuity, interruption, reduced motion) | ✅ / ⚠️ / ❌ | #F11 |
| Accessibility (keyboard, SR, focus, semantic HTML, contrast, touch targets, reduced motion, forms, errors) | ✅ / ⚠️ / ❌ | #F12..F14 |

---

## Findings

### Finding 1 — <short title>

| Field | Value |
|---|---|
| **Severity** | Critical \| High \| Medium \| Low |
| **Confidence** | CONFIRMED \| HIGH CONFIDENCE \| POSSIBLE \| SPECULATIVE |
| **Dimension** | UX \| Visual \| Interaction \| Animation \| Accessibility |
| **Affected component** | <elemento/tela> |
| **Affected flow** | <fluxo> |
| **Reproduction** | <o que o usuário vê vs o que deveria ver> |
| **Expected behavior** | <esperado> |
| **Actual behavior** | <observado> |
| **Root cause** | <princípio violado — ex: "contraste 2.9:1 falha WCAG 1.4.3", "focus ring removido com `outline: none`", "empty state sem CTA"> |
| **Impact** | <consequência para o usuário> |
| **Recommendation** | <correção concreta> |

---

### Finding N — <short title>

<repetir o bloco acima>

---

## Research synthesis (se pesquisa foi realizada)

*Usar o formato de síntese de pesquisa do `AGENTS.md` § 5. Ex:*

## Research

### Reference
[Impeccable]

### Relevant Pattern
Espaçamento consistente baseado em 4px, hierarquia tipográfica clara, ausência de
decoração sem função.

### Why It Matters
O que separa design de "amador" de "profissional" é a consistência rítmica e a
disciplina visual.

### Adaptation
Aplicar o sistema de 4px no spacing dos cards da dashboard, que hoje varia
aleatoriamente.

### Trade-offs
Requer auditoria de todos os componentes existentes para uniformizar.

### Recommendation
Adotar as 3 primeiras regras do Impeccable (spacing system, type scale, no-orphan
decoration) como padrão do projeto.

---

## Accessibility checklist (WCAG spot-check)

| Check | Pass | Fail | N/A |
|---|---|---|---|
| Keyboard reachable (all interactive elements) | | | |
| Focus visible (no `outline: none` without substitute) | | | |
| Focus trap correct in modals | | | |
| Alt text on informative images | | | |
| aria-label on semantic icons | | | |
| aria-live on dynamic content | | | |
| Semantic HTML (`<button>`, `<nav>`, `<h1-h6>`) | | | |
| Text contrast ≥ 4.5:1 | | | |
| Touch targets ≥ 44×44px | | | |
| `<label>` on every form input | | | |
| Errors text + aria-live (not color-only) | | | |
| `prefers-reduced-motion` respected | | | |

---

## Out of scope / not reviewed

<O que não foi revisado e por quê.>

## Next steps

<Priorizado. Fix-first findings primeiro; riscos a monitorar depois.>
