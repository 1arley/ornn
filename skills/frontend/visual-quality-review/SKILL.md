---
name: visual-quality-review
description: Evaluates the visual craft and coherence of an implemented interface through typography, spacing, hierarchy, density, composition, color, and product-specific expression.
license: MIT
metadata:
    aes-category: frontend
    aes-priority: medium
---

# Visual Quality Review

## Objective

Identify evidenced defects in visual execution and coherence while distinguishing craft problems from personal taste, usability, and accessibility.

## When to Use

Use when reviewing an implemented interface for polish, typography, spacing, hierarchy, density, composition, color, consistency, visual noise, or generic generated appearance. Do not use to select libraries before implementation or to claim usability and WCAG failures outside this skill's evidence.

This skill owns visual craft. `ux-review` owns task usability, `accessibility-review` owns conformance, `interaction-design` owns state behavior, and `design-library-research` owns sourcing.

## Mental Model

Evaluate visual decisions as a system:

```text
product intent → visual hierarchy → repeated rules → component execution → whole-screen composition
```

A deviation is a defect only when it breaks a declared system, weakens communication, or produces measurable incoherence. “AI slop” is a diagnosis of unsupported generic choices, not a label for a particular gradient, font, or icon set.

## Investigation Procedure

1. Establish audience, brand, platform, design contract, tokens, and intended density. Inspect `PRODUCT.md`, `DESIGN.md`, and the design system when present.
2. Capture representative screens at supported viewports and states, using rendered output rather than source alone.
3. Inventory typography, spacing, grids, radii, color roles, elevation, iconography, imagery, and density. Derive the apparent system before judging deviations.
4. Evaluate hierarchy and reading order: prominence must match semantic importance.
5. Measure alignments, rhythm, line length, line height, contrast, overflow, and responsive composition where relevant.
6. Compare repeated components and states. Determine whether variance encodes meaning or is accidental drift.
7. Remove decorative layers mentally or experimentally; identify noise that competes with content without supporting brand or hierarchy.
8. Test whether generic motifs, placeholder copy, arbitrary gradients, excessive cards, or mismatched icons arise from product intent or from absent design decisions.
9. Reproduce each candidate across contexts, rule out intentional exceptions, and propose changes at token/system level when the pattern repeats.

## Questions to Ask

- What visual system is declared or consistently implied?
- Does prominence match product and content priority?
- Are typography, spacing, grid, and color roles internally coherent?
- Is density appropriate to task frequency and audience expertise?
- Do responsive states preserve composition rather than merely stack?
- Does decoration reinforce brand and hierarchy or compete with them?
- Is a generic-looking choice unsupported by product identity, or simply familiar?
- Is this defect visual craft, usability, accessibility, or interaction behavior?
- Can the recommendation fix the system rather than one symptom?

## Attack Patterns

- **Compare:** place equivalent screens and components side by side to expose drift.
- **Resize:** test narrow, wide, zoomed, sparse, and content-heavy states.
- **Replace content:** use long labels, realistic data, localization, empty values, and errors.
- **Strip decoration:** remove shadows, gradients, and borders to test structural hierarchy.
- **Invert context:** inspect light/dark modes and imagery with varied luminance.
- **Repeat:** enumerate one token or component across the product and find unexplained variants.

## Evidence Requirements

A `CONFIRMED` finding needs an exact element, rendered or computed measurements, the violated project rule or demonstrable internal inconsistency, reproduction context, and impact. `HIGH CONFIDENCE` uses clear structural evidence where measurement is incomplete. Use `POSSIBLE` for taste-sensitive concerns or inferred brand mismatch. Reference galleries and heuristics calibrate options; they do not prove a defect.

## False Positives

- Intentional exceptions may support hierarchy, campaign identity, or platform convention.
- Dense layouts can be correct for expert, monitoring, or data-heavy work.
- Sparse layouts can be correct for focus, storytelling, or infrequent tasks.
- Decoration that carries brand meaning is not automatically noise.
- Familiar icons, cards, gradients, or rounded corners are not independently “AI slop.”
- Dark mode need not be a literal inversion.
- Contrast failures should be verified and reported under `accessibility-review`; this skill may report weakened visual hierarchy without claiming WCAG failure.

## Output Format

Use `templates/audit-report.md`. Include viewport/state, affected element, visual-system invariant, measured or comparative evidence, expected and actual composition, mechanism, impact, recommendation, provenance, evidence records, and false-positive check. Group repeated symptoms under their shared token or component cause. Prioritize illegibility and broken responsive composition, then hierarchy and consistency, then polish and generic expression.
