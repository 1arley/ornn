---
name: design-library-research
description: Researches frontend libraries and real interface patterns before implementation by mapping product flows and states to comparable, adaptable interaction, motion, and accessibility candidates.
license: MIT
metadata:
  aes-category: frontend
  aes-priority: high
---

# Design Library Research

## Objective

Produce an evidence-backed design composition plan that connects real product needs to adaptable patterns and components across multiple relevant sources without copying another product's identity.

## When to Use

Use before a meaningful UI build or redesign when library, component, interaction, motion, or accessibility choices are unsettled and external comparison can change the implementation. Do not activate for a narrow implementation with a settled design contract, a post-implementation craft review, or a request for generic inspiration alone.

This skill owns pre-implementation discovery, comparison, and adaptation. It does not replace `ux-review`, `interaction-design`, `animation-review`, `visual-quality-review`, `accessibility-review`, or `react-doctor-audit`, which verify the resulting product.

## Mental Model

Research from product behavior outward, not from fashionable components inward:

```text
product goal → user flow → state transition → interaction requirement
→ candidate pattern → source implementation → adaptation contract
```

A component is useful only when its states and behavior fit the flow. Popularity, screenshots, and visual similarity are weak evidence. Compare implementation quality, accessibility, maintenance, license, platform fit, and adaptation cost.

## Investigation Procedure

1. Inspect `PRODUCT.md`, `DESIGN.md`, application code, routes, data model, existing design system, package constraints, and supported devices. State assumptions only where repository evidence is absent.
2. Map the target flows, actors, entry points, state transitions, failure states, content extremes, and responsive requirements.
3. Convert those needs into an interaction inventory before naming libraries: navigation, disclosure, selection, editing, feedback, loading, error, empty, permission, and recovery patterns.
4. Consult the relevant entries in `references/frontend.yaml` and `references/ux.yaml`. Use source type correctly: official documentation for behavior and API, repositories for implementation and maintenance, heuristics for critique, and galleries only for inspiration.
5. Search more than one materially different source when a choice has meaningful cost. Record version, license, activity, dependencies, rendering model, accessibility claims, and integration constraints.
6. Build a shortlist only for candidates that map to required states. Test documentation, demos, and source for keyboard behavior, responsive behavior, reduced motion, theming, composition, and failure states.
7. Compare candidates using criteria weighted by the product, not an unweighted feature count. Include “build with existing primitives” as a candidate.
8. Compose screen and flow decisions across components. Check that navigation, feedback, layering, density, and motion form one language instead of a collage.
9. Define the adaptation boundary: behavior to preserve; styling, tokens, copy, and structure to change; dependencies to avoid; and unresolved risks.
10. Verify decisive claims from primary sources and hand off a traceable plan with implementation spikes for remaining uncertainty.

## Questions to Ask

- Which product goal and state transition does each candidate serve?
- What evidence shows that the candidate handles required states, input methods, and content extremes?
- Is a library needed, or can existing project primitives satisfy the requirement more coherently?
- What are the license, maintenance, bundle, framework, rendering, and dependency costs?
- Does the candidate preserve native semantics, keyboard behavior, focus, reduced motion, and theming?
- Which behavior should be adopted, adapted, or rejected?
- Do selected patterns compose into one system, or import conflicting assumptions?
- Is a source authoritative for this claim, or merely inspirational?
- What uncertainty requires a spike rather than confident recommendation?

## Attack Patterns

- **Reverse-map:** start from every shortlisted component and demand a specific product state it solves; remove orphan choices.
- **Compare:** evaluate at least two viable approaches plus existing primitives for consequential decisions.
- **Manipulate content:** test long copy, localization, empty/error/loading states, dense data, and small screens.
- **Interrupt:** inspect overlays, asynchronous transitions, cancellation, and route changes under latency.
- **Strip style:** compare semantics and behavior without visual branding.
- **Stale-state check:** verify versions, repository activity, documentation, deprecations, and framework compatibility.
- **Compose:** place candidates together and look for conflicting tokens, interaction conventions, dependencies, or accessibility models.

## Evidence Requirements

For each recommendation, record the product requirement, candidates considered, comparison criteria, decisive evidence, source type, source/version/date, trade-offs, adaptation, and confidence. A `CONFIRMED` technical claim requires direct primary-source or observed implementation evidence. `HIGH CONFIDENCE` requires a clear mechanism and concrete source evidence. Use `POSSIBLE` for incomplete demos or unverified integration assumptions. Inspiration is never proof of feasibility, quality, or accessibility.

## False Positives

- A bespoke implementation may be lower risk than adding a library for a small primitive.
- A mature but quiet library is not necessarily abandoned; inspect compatibility and maintenance signals.
- Visual similarity does not imply behavioral fit.
- An accessible primitive does not make its composed product flow accessible.
- More sources do not improve research after the relevant decision space is covered.
- Different patterns can coexist when platform, modality, or task semantics justify them.
- Existing project conventions may outweigh a theoretically stronger external candidate.
- Do not copy proprietary code, branding, content, or identity; verify licenses and adapt patterns.

## Output Format

Produce: (1) product and scope summary; (2) flow/state map; (3) interaction inventory; (4) candidate matrix with URLs, versions, source types, licenses, criteria, and evidence; (5) rejected candidates and reasons; (6) screen-to-flow-to-pattern-to-component composition plan; (7) adaptation contract; (8) accessibility, motion, responsive, and integration risks; (9) implementation sequence or spikes; and (10) open uncertainties. Make every recommendation traceable to a product requirement. This is a research deliverable, not an audit finding; use `templates/audit-report.md` only if the work also verifies defects.
