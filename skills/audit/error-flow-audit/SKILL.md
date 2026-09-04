---
name: error-flow-audit
description: Investigates partial success, timeouts, lost responses, retries, crashes, and rollback failures to find states left inconsistent or operations left half-done when something fails mid-flight.
license: MIT
metadata:
    aes-category: audit
    aes-priority: high
---

# Error Flow Audit

## Objective

Verify that multi-step operations preserve invariants when any step fails, times out, crashes, or is retried, and that recovery neither loses nor duplicates effects.

## When to Use

Use for workflows with multiple writes, external services, queues, files, webhooks, payments, notifications, caches, or background jobs. Prioritize irreversible or value-bearing effects.

This skill focuses on failure boundaries and recovery. Compose with `idempotency-audit` for duplicate retry effects, `state-consistency-audit` for divergence, `race-condition-hunter` for interleavings, and `data-integrity-audit` for transactional guarantees. Do not report the same partial-failure mechanism separately under every symptom.

## Mental Model

Success paths show intent; failure paths reveal the real protocol. Model an operation as a sequence of durable and non-durable effects:

```text
step A → step B → step C
          ↑ inject failure at every boundary
```

For each boundary determine what committed, what the caller observed, what can retry, and what reconciles later. Atomic transactions, idempotent steps, compensation, durable outboxes, and reconciliation are different controls; none should be assumed from a `try/catch`.

## Investigation Procedure

1. Map every step, side effect, ownership boundary, commit point, and response point.
2. Define the invariant and acceptable intermediate states, including their maximum duration.
3. Enumerate failures before, during, and after each effect: rejection, timeout, lost response, crash, cancellation, malformed result, and unavailable dependency.
4. Trace transaction scope and determine which external effects cannot roll back with local state.
5. Inspect retry ownership, retry policy, idempotency identity, dead-letter handling, compensation, and reconciliation.
6. Inject or simulate failures at each meaningful boundary and restart workers/processes where safe.
7. Observe persisted state, external effects, messages, response, logs, and subsequent retry behavior.
8. Verify convergence and operator visibility; assign evidence confidence and consolidate by root cause.

## Questions to Ask

* What is the last durable effect before each possible failure?
* Can the caller distinguish rejection, timeout, and committed-but-response-lost?
* Who retries, with which identity, limit, and backoff?
* Can a local rollback undo an already-sent email, charge, message, or file write?
* Is compensation idempotent, authorized, and itself recoverable?
* Which intermediate states are legal, and who reconciles them by when?
* What happens if a worker crashes after effect but before acknowledgement?
* Are poison messages quarantined without blocking unrelated work?
* Can an operator detect and safely replay or repair the operation?

## Attack Patterns

```text
fail before commit:      dependency succeeds? local write rejects → orphan effect
fail after commit:       local write commits → response lost → caller retries
worker crash:            effect executes → crash before ack → delivery repeats
split transaction:       write A commits → write B fails → invariant diverges
bad compensation:       rollback called twice → value removed twice
retry exhaustion:        transient failure persists → dead letter ignored
recovery race:           reconciler and user retry repair simultaneously
timeout ambiguity:       dependency times out but later commits → duplicate retry
```

## Evidence Requirements

Provide the invariant, ordered timeline, injected or traced failure point, durable states before/after, caller-visible outcome, retry/compensation behavior, and final convergence. Cite transaction boundaries and exact files/lines or include a reproducible fault-injection test.

Use the `AGENTS.md` confidence scale. A missing `try/catch` is not evidence; an exact non-atomic reachable sequence can support `HIGH CONFIDENCE`, while `CONFIRMED` requires observation. State environmental assumptions such as queue delivery guarantees.

## False Positives

Do not report a temporary intermediate state when bounded eventual consistency is documented and reconciliation is proven. Verify transaction wrappers, outbox/inbox patterns, idempotency records, provider guarantees, and framework acknowledgment semantics. A logged error is not a consistency defect by itself. Compensation is not required when the operation is atomic or the effect is intentionally best-effort and the product contract allows loss.

## Output Format

Use `templates/audit-report.md`. Include invariant, failure timeline, commit points, reproduction, expected/actual recovery, mechanism, impact, severity, confidence, recommendation, and provenance.

Add a failure matrix: step/boundary, injected failure, committed effects, observed response, retry owner, compensation/reconciliation, final state, and coverage status. Consolidate symptoms caused by one missing atomicity or recovery mechanism.
