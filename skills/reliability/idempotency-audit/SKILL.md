---
name: idempotency-audit
description: Tests whether retries, replays, redeliveries, and concurrent duplicates produce one intended effect for payments, grants, creation, webhooks, notifications, and counters.
license: MIT
metadata:
    aes-category: reliability
    aes-priority: high
---

# Idempotency Audit

## Objective

Verify that repeated delivery of the same logical operation converges on one intended effect and one stable outcome, including after lost responses, crashes, redelivery, and concurrency.

## When to Use

Use this skill for operations that create, charge, debit, grant, dispatch, increment, transition, or consume a one-time event; for webhook and queue consumers; and wherever callers or infrastructure retry. Trigger it for duplicate orders, double charges, repeated rewards, duplicate notifications, replayed webhooks, or ambiguous timeout recovery.

Do not assume every identical payload is the same intent: two legitimate purchases may have equal fields. The contract needs stable operation identity or a domain uniqueness rule. Compose with `race-condition-hunter` for simultaneous duplicates, `error-flow-audit` for uncertain outcomes, `data-integrity-audit` for unique enforcement, `gamification-audit` for reward abuse, and `api-abuse-audit` for hostile replay. Give the root cause one primary finding owner.

## Mental Model

Idempotency is a protocol over a logical operation, not an HTTP verb or disabled button:

```text
operation identity + authenticated scope + canonical intent
    -> atomic admission -> one durable outcome and effect set
    -> every duplicate returns or converges on that outcome
```

The key must have the correct caller and operation scope, be bound to the original intent, be reserved atomically before effects escape, and survive the retry window. Reusing a key with different intent must not silently return an unrelated result. Database deduplication alone cannot undo an external charge or message already sent; the effect boundary and provider guarantees matter.

## Investigation Procedure

1. Inventory non-repeatable effects and duplicate sources: client/proxy retries, worker redelivery, webhook replay, timeout, crash recovery, and hostile replay.
2. Define logical operation identity, scope, canonical request fields, duplicate response, retention window, and failure behavior.
3. Trace key validation, reservation, state transitions, effects, result persistence, acknowledgement, and expiry.
4. Verify atomic admission through a unique constraint or conditional insert; lookup-then-insert is race-prone.
5. Reuse a key with changed amount, recipient, resource, or tenant and require an explicit mismatch response.
6. Test sequential duplicates, lost-response retry, and synchronized concurrent duplicates. Inspect responses plus internal and external effect counts.
7. Inject failure before reservation, after reservation, around external effects, and before result persistence. Check stale `in-progress` recovery.
8. Test expiry and late redelivery against documented caller, broker, and provider retry windows.
9. Consolidate evidence by logical operation rather than reporting each duplicate manifestation separately.

## Questions to Ask

* What proves two deliveries represent one logical operation rather than equal legitimate intents?
* Is identity scoped by caller, account, endpoint, operation type, and environment where needed?
* Is canonical intent stored and compared when a key is reused?
* Is reservation atomic, and what does a concurrent loser receive?
* Is the result durable before acknowledgement?
* What happens after an external effect but before local completion?
* Does the downstream provider accept the same operation identity?
* How are `in-progress`, failed, canceled, and unknown states recovered?
* Does retention cover every retry and redelivery window?
* Can authorization changes expose another caller's cached result?

## Attack Patterns

```text
sequential replay
    submit K -> success -> submit K again
    verify one effect and a stable compatible response

intent mismatch
    submit K with amount=10 -> submit K with amount=100
    require conflict; never silently reuse the first result

lost response
    complete K -> discard response -> retry K
    count internal and external effects

concurrent duplicate
    pause A and B before reservation -> release together
    verify only one execution owner

crash window
    reserve K -> perform external charge -> crash before local completion
    recover and verify no second charge

late redelivery
    process event E -> expire dedup record -> redeliver E
    compare retention with provider guarantees

cross-scope collision
    callers A and B submit the same K
    verify no result leakage and correct independent intent handling
```

Use sandbox providers and disposable data for irreversible effects. Repeating a payload without shared operation identity does not establish a defect.

## Evidence Requirements

Document the operation, identity and scope, stored intent, duplicate source, effect boundary, and expected contract. Show the exact sequence and count durable internal and external effects; status codes alone are insufficient. Cite admission code, unique enforcement, lifecycle states, and retention.

`CONFIRMED` requires observed duplicate/mismatched effects for one logical operation or an incorrect cached-result leak. `HIGH CONFIDENCE` requires an exact reachable path by which a duplicate crosses the effect boundary without atomic protection. `POSSIBLE` means identity, reachability, or downstream behavior is unresolved. `SPECULATIVE` is not blocking. Confidence follows evidence, not impact.

## False Positives

Do not treat equal payloads as duplicates without evidence of shared intent. Naturally idempotent assignment may still emit non-idempotent side effects, so inspect the full effect set. A `409`, cached error, or `in-progress` response may be correct if documented and recoverable. At-least-once delivery is not a bug when consumption deduplicates safely. Approximate analytics may accept duplicates within a measured error budget. Client submit prevention is UX, not server idempotency. Do not report short retention without comparing actual retry contracts and risk.

## Output Format

Use `templates/audit-report.md` for each affected logical operation. Include identity/scope, canonical intent, retry or failure sequence, internal and external effect counts, responses, root cause, impact, evidence level, provenance, and precise atomic admission and recovery recommendations.

```text
operation | identity/scope | intent binding | atomic admission | crash recovery | retention | result
```

Prioritize money, entitlements, inventory, and durable outbound effects. Cross-reference concurrency, integrity, and failure findings instead of duplicating them.
