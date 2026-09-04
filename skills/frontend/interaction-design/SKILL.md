---
name: interaction-design
description: Evaluates whether interactive controls define coherent states, transitions, feedback, and recovery across pointer, keyboard, touch, and asynchronous use.
license: MIT
metadata:
    aes-category: frontend
    aes-priority: medium
---

# Interaction Design

## Objective

Verify that every interactive element communicates what can happen, what is happening, what happened, and how the user can recover across supported input methods.

## When to Use

Use for controls, forms, menus, dialogs, drag-and-drop, gestures, optimistic actions, and asynchronous interactions, especially when behavior feels unresponsive, ambiguous, inconsistent, or easy to trigger twice. Do not use for purely static visual critique or a full end-to-end journey audit.

This skill owns local interaction state and feedback. `ux-review` owns task-level comprehension, `animation-review` owns temporal motion quality, and `accessibility-review` owns equivalent access. Consolidate shared symptoms by invariant and root cause.

## Mental Model

Treat every control as a state machine:

```text
available → hover/focus → pressed → pending → success | error → recoverable
                 ↘ disabled, cancelled, interrupted, or stale
```

Affordance, input, logical state, and feedback must agree. A visually disabled control that submits, or a pending action that appears idle, is a state mismatch rather than missing polish.

## Investigation Procedure

1. Identify critical tasks and inventory controls, clickable containers, shortcuts, gestures, and implicit row actions.
2. Derive reachable states from UI, code, design system, and server behavior: default, hover, focus, active, selected, disabled, pending, success, error, stale, and cancellation where applicable.
3. Exercise states with pointer, keyboard, and touch. Verify affordance, semantics, target, and feedback match the available action.
4. Trace each trigger through response. Test latency, failure, optimistic rollback, repeat activation, navigation away, and stale completion.
5. Compare equivalent controls against `DESIGN.md` or the design system; distinguish intentional hierarchy from divergence.
6. Test overlays and composite widgets for open, selection, dismissal, outside click, Escape, focus restoration, and nesting conflicts.
7. Reproduce candidates, identify the failed transition, and rule out platform conventions.

## Questions to Ask

- Can users identify the available action before activating it?
- Does every reachable state have deliberate visual and behavioral representation?
- Are disabled, read-only, unavailable, and pending states distinct?
- Does feedback appear at the locus of action and persist long enough?
- Can repeat, cancellation, failure, or navigation produce duplicate work or stale UI?
- Do supported input methods reach equivalent outcomes?
- Is friction proportional to destructive or irreversible consequences?
- Does apparent inconsistency encode context, or is it accidental?

## Attack Patterns

- **Repeat:** double-click or press Enter during latency.
- **Reverse:** toggle or undo before completion; latest intent should win.
- **Reorder:** open, select, dismiss, and navigate in unusual order.
- **Skip:** bypass hover with keyboard or touch.
- **Interrupt:** blur, resize, go offline, background, or close during work.
- **Manipulate:** force empty, error, partial, disabled, denied, and stale states.

## Evidence Requirements

A `CONFIRMED` finding requires an exact control, initial state, action sequence, observed state, expected state, and mechanism, with runtime or test evidence. `HIGH CONFIDENCE` requires structural evidence proving a reachable mismatch. `POSSIBLE` fits incomplete states or uncertain impact. Screenshots prove one state, not transition behavior. Preference without an invariant is not a finding.

## False Positives

- Touch devices do not require hover; critical information simply cannot depend on it.
- Native controls may retain platform-specific treatments.
- A disabled state may be omitted when an enabled action provides a clear explanation.
- Truly instantaneous actions do not need visible loading.
- Different treatments may correctly express destructive, primary, compact, or contextual actions.
- Library defaults must still be tested in product context.
- Pure motion-quality defects belong to `animation-review`.

## Output Format

Use `templates/audit-report.md`. Name the control, invariant, initial state, trigger, expected and actual next state, recovery, input methods tested, mechanism, impact, fix, provenance, evidence, and false-positive check. Prioritize blocked or duplicate actions, destructive mistakes, unrecoverable state, and missing error feedback before cosmetic inconsistency.
