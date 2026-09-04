---
name: user-flow-audit
description: Maps a user flow as entry → preconditions → action → state change → feedback → next state and detects dead ends, impossible states, skippable steps, refresh and back-button problems, and duplicate operations.
license: MIT
metadata:
    aes-category: audit
    aes-priority: high
---

# User Flow Audit

## Objective

Verify that every supported user journey has reachable entry conditions, valid transitions, truthful feedback, recoverable interruptions, and a clear next state across navigation and repetition.

## When to Use

Use for onboarding, checkout, creation/editing, destructive actions, multi-step forms, authentication, invitations, approvals, and flows with refresh/back behavior or asynchronous completion.

This skill evaluates end-to-end continuity and feedback, not visual polish or authorization depth. Compose with `ux-review` for usability, `state-consistency-audit` for cross-layer disagreement, `error-flow-audit` for partial failure, `business-logic-audit` for invalid transitions, and `accessibility-review` for assistive access.

## Mental Model

Represent each journey as a state machine:

```text
entry → preconditions → action → state transition → feedback → next state
```

Audit the graph, not one scripted happy path. Every reachable state needs an honest explanation and recovery or next action. Navigation, refresh, retry, duplicate submission, session expiry, and direct URLs are transitions too.

## Investigation Procedure

1. Identify actor, goal, entry points, prerequisites, success criteria, and durable effects.
2. Map states and transitions from product context, routes, UI, API behavior, tests, and persisted state. Separate intended from merely implemented paths.
3. Walk the primary path and verify feedback matches authoritative state.
4. Explore alternate entry, cancel, back/forward, refresh, deep link, duplicate submit, timeout, retry, session expiry, and resume.
5. Test empty, loading, permission-denied, conflict, validation, partial-success, and unavailable states.
6. Verify irreversible actions have appropriate confirmation and that recovery does not duplicate effects.
7. Check transitions across devices/tabs or actors when the flow supports them.
8. Record unreachable states, dead ends, loops, misleading success, and tested paths that work.

## Questions to Ask

* Can every intended actor discover and enter the flow with prerequisites satisfied?
* What happens when the user deep-links into each step?
* Can required steps be skipped or completed out of order?
* Does refresh or back/forward preserve, repeat, or corrupt an operation?
* Is submit disabled only visually, or is duplicate execution prevented?
* Does feedback reflect the authoritative result rather than optimistic intent?
* After validation, conflict, timeout, or session expiry, can the user recover without losing valid work?
* Are cancel and destructive confirmation semantics clear and reversible where promised?
* Does every terminal state offer an appropriate next action?

## Attack Patterns

```text
deep link:       open step 3 without steps 1–2
refresh:         reload during submit or callback
back/revisit:    complete → back → submit again
double submit:   click/keypress twice or retry after timeout
expired session: begin authenticated flow → expire → finish
stale conflict:  edit old version after another actor changes it
cancel/resume:   abandon mid-flow → return later with partial state
partial success: server commits → UI receives error → user retries
empty/error:     remove last item or deny permission → no recovery path
```

## Evidence Requirements

Provide the actor, goal, entry state, preconditions, exact transition sequence, expected and actual state/feedback, durable effects, and recovery outcome. Cite routes/components/handlers or include a reproducible interaction trace.

Use the `AGENTS.md` confidence scale. A confusing label alone belongs to UX review unless it causes a wrong transition or blocks completion. `CONFIRMED` requires observed flow behavior; structural evidence can support `HIGH CONFIDENCE` when reachability is exact.

## False Positives

Do not report intentional terminal states, documented restart behavior, or unavailable actions correctly explained by permissions or prerequisites. Verify server idempotency before treating a disabled button as the only duplicate defense. Browser back behavior is not defective merely because it returns to a previous view; show repeated effects, invalid state, data loss, or broken expectations. Do not assume drafts must persist unless the product contract requires it.

## Output Format

Use `templates/audit-report.md`. Include actor/goal, affected flow, state transition, reproduction, expected/actual behavior, feedback mismatch, root cause, impact, severity, confidence, recommendation, and provenance.

Add a flow map or transition table with entry, preconditions, action, resulting state, feedback, next state, and coverage status. Consolidate multiple dead ends caused by one missing transition or recovery rule.
