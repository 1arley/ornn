---
name: accessibility-review
description: Evaluates whether a user interface provides equivalent access through keyboard, assistive technology, perceivable content, and accessible state communication against applicable WCAG criteria.
license: MIT
metadata:
    aes-category: frontend
    aes-priority: high
---

# Accessibility Review

## Objective

Determine whether people can perceive, understand, navigate, and operate an interface regardless of input method or assistive technology, and report only barriers supported by direct evidence.

## When to Use

Use for an explicit accessibility, a11y, WCAG, keyboard, screen-reader, focus, contrast, touch-target, form, or reduced-motion review, and before release of interaction-heavy or dynamically updated interfaces. Do not activate for a purely aesthetic critique or assume that every frontend task requires a full accessibility audit.

This skill owns conformance and equivalent access. Compose with `interaction-design` for the completeness of visible control states, `animation-review` for motion quality, and `ux-review` for comprehension. When the same defect appears in multiple reviews, preserve one finding and record all provenance.

## Mental Model

Accessibility is an end-to-end user capability, not a checklist of ARIA attributes. Trace each essential task through four layers:

```text
perceive content → identify purpose/state → reach and operate controls → receive the result
```

Native semantics are the default. ARIA supplements missing semantics; it does not repair broken interaction. Judge the rendered accessibility tree and actual behavior, not JSX appearance alone. Apply the WCAG version and conformance target declared by the project; if none is declared, state the review baseline instead of silently assuming one.

## Investigation Procedure

1. Establish target users, platforms, supported browsers, the declared WCAG target, and critical tasks. Inspect `PRODUCT.md`, `DESIGN.md`, the design system, and existing accessibility tests when present.
2. Inventory pages, landmarks, dialogs, forms, custom widgets, media, notifications, and dynamic state changes. Prioritize task-blocking paths.
3. Operate each critical task with keyboard only. Verify reachability, logical order, expected keys, visible focus, escape behavior, and absence of traps.
4. Inspect native semantics, accessible names and descriptions, relationships, states, heading and landmark structure, image alternatives, and status announcements. Confirm uncertain behavior with a real accessibility tree or screen reader when available.
5. Test focus transitions after navigation, insertion, deletion, validation, dialog open/close, and asynchronous updates. Focus must move deliberately and return to a meaningful location.
6. Measure text and non-text contrast from computed colors, including hover, focus, disabled, error, dark-mode, and overlay states. Measure effective pointer targets and spacing rather than icon dimensions alone.
7. Test zoom, text resize, reflow, orientation, and responsive layouts for clipping, overlap, lost content, or prohibited two-dimensional scrolling.
8. Verify form instructions, labels, grouping, autocomplete, validation, error association, recovery, and prevention for consequential submissions.
9. Verify media alternatives and motion controls. Test `prefers-reduced-motion`; do not equate reduced motion with removing every transition.
10. Reproduce each candidate barrier, map it to the applicable criterion, rule out documented exceptions, and consolidate duplicate symptoms by root cause.

## Questions to Ask

- Can every essential task be completed without a pointer, and do custom widgets implement the expected keyboard pattern?
- Does focus remain visible, ordered, and meaningful after every state transition?
- Do accessible names communicate purpose without relying on nearby visual context, and do names remain stable across states?
- Are status, validation, loading, and error changes announced at the right time without noisy repetition?
- Does the semantic structure remain useful when styling is removed or the accessibility tree is inspected?
- Are contrast, target size, zoom, text spacing, and reflow verified from rendered values at all supported breakpoints?
- Do error prevention and recovery match the consequence of the action?
- Is an apparent violation covered by a documented WCAG exception, alternative path, or equivalent accessible mechanism?

## Attack Patterns

- **Skip the pointer:** complete the primary flow with Tab, Shift+Tab, Enter, Space, arrow keys, and Escape; attempt to reach every action and leave every composite widget.
- **Reverse focus:** open and close overlays, cancel workflows, navigate back, remove the focused item, and confirm focus returns to a valid origin.
- **Reorder content:** zoom, enlarge text, rotate, narrow the viewport, and change text spacing; look for clipped controls, lost reading order, and hidden actions.
- **Replay announcements:** trigger loading, success, and error states repeatedly; detect silence, stale messages, or duplicate live-region speech.
- **Manipulate presentation:** enable high contrast, dark mode, reduced motion, and forced colors where supported; inspect every interactive state.
- **Bypass labels:** inspect computed accessible names and submit invalid forms without relying on color, placeholder text, or visual proximity.

## Evidence Requirements

Use the repository evidence scale. A `CONFIRMED` finding requires a reproducible task, observed result, exact element or source location, expected behavior, root cause, and applicable WCAG criterion. `HIGH CONFIDENCE` requires an exact mechanism plus structural evidence, such as a custom clickable element with no keyboard handler, when runtime reproduction is unavailable. `POSSIBLE` is appropriate for incomplete environment coverage or uncertain user impact. A standard, heuristic, automated scan, or code smell alone is not confirmation.

Record browser, viewport, input method, assistive technology and version when relevant, computed values for measurements, and whether evidence came from runtime, accessibility tree, source, or an automated tool. Automated results are hypotheses until verified.

## False Positives

- `alt=""` is correct for truly decorative or redundant images; informative images require an equivalent alternative.
- A visually hidden label or accessible name can be valid when persistent visible context is unnecessary and the computed name is sufficient.
- Removing the default outline is not a defect when an equally visible focus indicator exists in every relevant state.
- A small visual glyph may have a conforming effective hit area and target spacing.
- `tabindex="-1"` can be correct for programmatic focus, and a modal focus trap is intentional when it can be escaped and restored.
- Not every dynamic update belongs in a live region; announcing nonessential changes can reduce usability.
- Reduced-motion mode may retain low-risk fades or essential state transitions. Evaluate the motion and user control, not the mere presence of animation.
- Do not claim conformance from partial sampling or report a WCAG failure without checking its scope and exceptions.

## Output Format

Use `templates/audit-report.md`. For every finding include severity, confidence, affected component, invariant, state transition, affected flow, reproducible steps, expected and actual behavior, mechanism, impact, concrete recommendation, provenance, evidence records, WCAG criterion, environment, and false-positive check. Order findings by blocked critical task, then loss of information or control, then material friction. Consolidate shared accessibility/interaction/animation symptoms by invariant and mechanism. If no violation is verified, report the tested scope and remaining coverage gaps rather than manufacturing findings.
