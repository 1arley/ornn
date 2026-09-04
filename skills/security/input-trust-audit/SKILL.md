---
name: input-trust-audit
description: Identifies values that should never be trusted from the client (userId, role, price, XP, permissions, ownership, status, reward, timestamps) and verifies the server derives them from the session or database instead of the request payload.
license: MIT
metadata:
    aes-category: security
    aes-priority: high
---

# Input Trust Audit

## Objective

Identify client-controlled values that influence identity, authority, ownership, value, lifecycle, or time, and verify that the server derives or validates them against an authoritative source before any effect.

## When to Use

Use for APIs that accept actor IDs, tenant IDs, roles, permissions, ownership, prices, quantities, rewards, status, timestamps, or generic model updates. Prioritize checkout, grants, transfers, invitations, administration, and state transitions.

Focus on the provenance of security- and business-sensitive values. Compose with `authorization-audit` for access decisions, `business-logic-audit` for the underlying invariant, `api-abuse-audit` for direct request manipulation, and `data-integrity-audit` for persistence enforcement.

## Mental Model

All client input is untrusted, but not all input must be server-derived. Classify each value:

```text
user intent → validate and constrain
authority/value fact → derive from verified session, database, policy, or trusted event
```

The danger is not merely accepting a field; it is allowing that field to determine an authoritative effect. Generic binding creates mass assignment when writable transport fields exceed the explicit domain command.

## Investigation Procedure

Consult `knowledge/security/input-trust.md` when its provenance and mass-assignment model is needed.

1. Inventory request values from path, query, body, headers, cookies, metadata, uploads, and callback payloads.
2. Trace each value through parsing, schema validation, mapping, domain logic, persistence, and downstream effects.
3. Classify it as user intent, identifier/reference, or authority/value fact; document expected provenance.
4. Verify identity and tenant from authenticated context; roles/permissions and ownership from current authoritative state; price/reward/status/time from trusted rules or signed events.
5. Inspect generic bind/update/spread operations and establish an explicit allowlist.
6. Forge sensitive values, add unknown fields, change representation, and test conflicting path/body identities.
7. Confirm actual persistence or effect, not only request acceptance.
8. Check legitimate delegated/admin override paths for independent authorization and auditing.

## Questions to Ask

* Which values influence who acts, who owns, what is allowed, how much value moves, or which state results?
* What is the authoritative source for each value?
* Does path, body, query, or session win when identities conflict?
* Are roles and permissions refreshed from authoritative state or trusted from stale claims?
* Are price, discount, quantity bounds, reward, and totals recalculated server-side?
* Can status or timestamps bypass a required transition or expiry?
* Does model binding accept fields the UI never sends?
* Is a delegated override explicitly authorized, scoped, and audited?

## Attack Patterns

```text
identity:       body.userId = other actor while session belongs to caller
tenant:         path tenant A + body/resource from tenant B
mass assignment:update benign fields plus role/isAdmin/ownerId/status
price/value:    price=0, negative amount, forged discount, reward=99999
ownership:      choose ownerId/assignedTo without transfer authorization
transition:     set paid/approved/active directly instead of trusted event
time:           forge createdAt/expiresAt to evade ordering or expiry
conflict:       path ID, body ID, and session subject disagree
```

## Evidence Requirements

Name the field, classification, expected authority, actual provenance, request mutation, and resulting decision/persistence/effect. Cite the full source-to-sink path with file/line evidence or provide a reproducible request.

Apply the `AGENTS.md` confidence scale. Merely accepting or parsing a sensitive field is not a confirmed defect if it is ignored or revalidated. `CONFIRMED` requires an observed unauthorized effect; exact source-to-sensitive-sink flow can support `HIGH CONFIDENCE`.

## False Positives

Do not report legitimate user-intent fields, explicitly allowlisted updates, fields ignored after parsing, or client references checked against authoritative state. A client-supplied scheduled time may be valid when bounded and distinct from server creation time. Signed, freshness-checked provider callbacks can authoritatively supply status. Verify downstream recomputation and database controls before claiming trust.

## Output Format

Use `templates/audit-report.md`. Include endpoint and field, expected/actual provenance, invariant, reproduction, effect, source-to-sink mechanism, impact, severity, confidence, recommendation, and provenance.

Add a per-endpoint field table: field, classification, authoritative source, accepted/derived/validated, sink, and tested result. Prioritize privilege, ownership, and financial/reward values; group fields sharing one unsafe binder.
