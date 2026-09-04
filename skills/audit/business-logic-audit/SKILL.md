---
name: business-logic-audit
description: Identifies business rules, invariants, limits, ownership, transitions, and rewards and for each asks where it is enforced, whether it can be bypassed, repeated, reversed, or raced.
license: MIT
metadata:
    aes-category: audit
    aes-priority: high
---

# Business Logic Audit

## Objective

Extract implicit business rules, express them as invariants, and determine whether every reachable path preserves them under bypass, repetition, reversal, retry, and concurrency.

## When to Use

Use for quotas, limits, ownership, permissions, lifecycle transitions, inventory, money, or internal economies. It is especially valuable before releasing features that transfer or grant countable value.

Use this skill to establish the rule and enforcement map; compose with `gamification-audit`, `idempotency-audit`, `race-condition-hunter`, `authorization-audit`, `data-integrity-audit`, and `input-trust-audit` for specialized verification. Do not duplicate findings that share one failed invariant and root cause.

## Mental Model

A stated or implied rule is not a guarantee. Convert it into a predicate over state and transitions:

```text
precondition + action → postcondition
invariant holds before and after, including failure and concurrency
```

For every rule ask where it is enforced and whether it can be bypassed, repeated, reversed, retried, or raced. Enforcement is only as strong as the weakest reachable write path. Frontend checks are not authoritative; application checks may race; database constraints protect only the invariant they encode.

## Investigation Procedure

Consult `knowledge/engineering/invariants.md` and `knowledge/product/quotas-and-limits.md` when their enforcement or quota models are needed.

1. Inventory rules from product context, schemas, handlers, tests, UI copy, jobs, and integrations. Label inferred rules.
2. Rewrite each rule as a precise invariant, including scope, clock, actor, resource, boundaries, and expected failure behavior.
3. Enumerate all mutation paths: APIs, jobs, admin tools, imports, callbacks, and direct database operations.
4. Map enforcement across UI, API, domain, persistence, and external services; identify the authoritative decision point.
5. Test bypass, repeat, reverse, retry/replay, reordering, boundary values, and concurrency where relevant.
6. Trace side effects and compensation on success, rejection, timeout, and partial failure.
7. Compare behavior with documented intent and controls; assign confidence and consolidate by root cause.

## Questions to Ask

* What precise state is impossible if the rule holds?
* Is its scope global, per tenant, actor, resource, or time window?
* Which clock and timezone define a time-based limit?
* Can another endpoint, job, admin path, or callback mutate the same state?
* Does the server derive identity, price, status, and reward authoritatively?
* Can retry, undo/redo, or state cycling grant value twice?
* Is read-decision-write atomic under concurrency?
* What happens at exact minimum, maximum, reset, expiry, and transition boundaries?
* Is an apparent violation an intentional, documented exception?

## Attack Patterns

```text
bypass:       use an alternate write path that omits the rule
repeat:       perform a one-time action N times
reverse:      gain value → undo prerequisite → retain value → repeat
replay:       lose response after commit → retry identical request
race:         two requests read eligible state → both commit
boundary:     use limit-1, limit, limit+1 at reset or expiry
transition:   force a forbidden edge or cycle states for another grant
authority:    forge actor, owner, price, reward, status, or timestamp
partial fail: primary write commits → dependent effect fails → impossible state
```

## Evidence Requirements

Provide the invariant and its provenance, relevant mutation paths, missing or insufficient enforcement, and a before/action/after reproduction or exact code trace. Distinguish product ambiguity from implementation failure.

Apply the `AGENTS.md` confidence scale. A missing frontend check alone is not a business-logic defect. A smell without a reachable violating transition is at most `POSSIBLE`.

## False Positives

Do not report documented exceptions, authorized override paths with independent controls, or eventually consistent states that converge within an explicit contract. Verify middleware, transactions, locks, unique/check constraints, idempotency records, and compensation. Do not infer a rule solely from UI copy when stronger product context or tests contradict it. A permissive transition is not a defect without an established invariant.

## Output Format

Use `templates/audit-report.md`. Include component and flow, invariant and source, state transition, reproduction, expected/actual behavior, mechanism, impact, severity, confidence, recommendation, and evidence provenance.

Also provide a rule matrix: invariant, scope, mutation paths, enforcement layers, tested attacks, result, and coverage gaps. Consolidate bypasses caused by one root cause unless impact or remediation differs materially.
