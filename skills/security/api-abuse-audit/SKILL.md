---
name: api-abuse-audit
description: Treats the API as directly accessible and investigates repetition, replay, ID manipulation, extra fields, alternative endpoints, missing rate limiting, and UI bypass to find abuse the server fails to prevent.
license: MIT
metadata:
    aes-category: security
    aes-priority: high
---

# API Abuse Audit

## Objective

Treat every API operation as directly callable and verify that server-side controls prevent unauthorized, automated, repeated, replayed, and economically abusive use without relying on the client UI.

## When to Use

Use for public or authenticated APIs, mobile/web backends, callbacks, GraphQL/RPC operations, uploads, exports, and value-bearing actions. Prioritize endpoints hidden or constrained only by UI.

Focus on abuse of an exposed protocol. Compose with `authorization-audit` for object/action access, `input-trust-audit` for forged authority values, `idempotency-audit` for retries, `business-logic-audit` for limits, and `race-condition-hunter` for concurrency. Test only systems and environments you are authorized to assess.

## Mental Model

The API—not the interface—is the product boundary. For each operation model:

```text
actor + credential + endpoint + parameters + repetition rate → effect and cost
```

Assume callers can craft requests, add fields, change verbs and content types, enumerate identifiers, parallelize, replay tokens, and call undocumented alternatives. A control counts only if it protects the exact server path and effect.

## Investigation Procedure

1. Inventory endpoints/operations, actors, credentials, objects, side effects, and trust boundaries from routes and schemas rather than UI alone.
2. Classify operations by read/write, value, sensitivity, reversibility, and resource cost.
3. Establish expected authorization, validation, quota, replay, idempotency, and rate-limit invariants.
4. Compare equivalent paths, verbs, versions, batch operations, exports, callbacks, and content types for control parity.
5. Test identifier substitution, unknown or sensitive fields, boundary values, repeat/replay, and safe concurrency.
6. Verify rate limits by identity dimensions, scope, atomicity, reset, proxy handling, and effect—not only response status.
7. Observe durable effects, downstream work, audit logs, and retry behavior.
8. Confirm reachability and controls, classify evidence, and consolidate shared root causes.

## Questions to Ask

* What can a caller do by invoking the endpoint directly?
* Are authentication, authorization, validation, and limits enforced on every equivalent path?
* Can IDs, tenant scope, role, price, status, or ownership be substituted?
* Are unknown fields rejected or safely ignored through an allowlist?
* Can repeated, replayed, batched, or concurrent calls multiply an effect?
* Can rate limits be bypassed by account, token, IP/header, endpoint alias, or distributed concurrency?
* Do expensive rejected requests still consume disproportionate resources?
* Are callback signatures, freshness, audience, and replay protections verified?

## Attack Patterns

```text
direct call:     invoke hidden/disabled UI action with ordinary credentials
ID swap:         replace owned object ID with another actor's ID
extra field:     add role, ownerId, price, status, reward, or isAdmin
path parity:     protected POST but unprotected PATCH/batch/export/v1 alias
repeat/replay:   identical request or callback N times → duplicate effect
concurrent:      burst requests around quota or one-time decision
rate bypass:     rotate account/token or spoof trusted proxy header
cost abuse:      huge page/filter/upload or expensive invalid query
```

## Evidence Requirements

Provide actor and credentials, exact request sequence, expected invariant, observed responses and durable effects, affected path/verb, and control trace with file/line provenance. Rate-limit findings need the limit dimension, window, scope, and demonstrated bypass or exact structural gap.

Use the `AGENTS.md` confidence scale. Endpoint existence or missing UI restriction is not a bug. `CONFIRMED` requires observed unauthorized or abusive effect; exact reachable missing control may support `HIGH CONFIDENCE`.

## False Positives

Verify route-level and inherited middleware, gateway/WAF controls, database policies, idempotency records, and downstream deduplication. A public endpoint is not vulnerable merely because it is callable. Unknown fields safely discarded are not mass assignment. A rate limit is not necessarily missing because it is absent from application code. Do not treat documented high-volume service accounts like ordinary users without checking their contract.

## Output Format

Use `templates/audit-report.md`. Include actor, endpoint/verb, invariant, reproduction, expected/actual effect, mechanism, impact, severity, confidence, recommendation, and provenance.

Add an endpoint coverage matrix containing authn, authz, validation/allowlist, rate/quota, replay/idempotency, alternatives, and tested result. Consolidate endpoints affected by one missing shared control where remediation is common.
