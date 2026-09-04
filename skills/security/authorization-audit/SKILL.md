---
name: authorization-audit
description: Analyzes authenticated vs authorized vs owner vs moderator vs admin vs resource-participant and verifies that authorization is enforced on the server for every resource access, not just authentication.
license: MIT
metadata:
    aes-category: security
    aes-priority: high
---

# Authorization Audit

## Objective

Verify that every server-side resource and action access enforces the intended relationship among actor, tenant, resource, action, and current state—not merely that the caller is authenticated.

## When to Use

Use for multi-user or multi-tenant systems, object IDs in requests, roles, memberships, sharing, moderation, admin functions, exports, files, and background or callback access.

Focus on authorization decisions. Compose with `input-trust-audit` when identity or role comes from the client, `api-abuse-audit` for alternate paths, and `data-integrity-audit` for tenant/ownership constraints. Authentication defects are separate unless they directly undermine the authorization evidence.

## Mental Model

Model every decision as:

```text
subject + action + resource + relationship + tenant + current state → allow/deny
```

Authentication answers who the caller claims to be. Authorization proves whether that subject may perform this action on this resource now. Roles alone are insufficient when ownership, membership, assignment, scope, or state matters. Deny by default and enforce at the server or data boundary on every path.

## Investigation Procedure

1. Inventory subjects, roles, tenants, resources, relationships, actions, and lifecycle states.
2. Derive an access-control matrix from product context, policies, tests, handlers, and UI indicators; label ambiguous policy.
3. Enumerate all server operations, including nested routes, batch/export, files, alternate verbs/versions, jobs, and admin paths.
4. Trace identity from verified session/token and resource scope from authoritative storage to the decision point.
5. Test at least owner/member/non-member, cross-tenant, moderator/admin, revoked membership, and deleted/archived states where applicable.
6. Substitute IDs in path, query, body, nested objects, and indirect references; test list/search/count/export as well as detail writes.
7. Verify middleware coverage and query scoping for the exact route and verb; check TOCTOU where relationships change.
8. Record allowed and denied cases, assign evidence confidence, and consolidate shared policy failures.

## Questions to Ask

* Is this route authenticated, authorized for the action, and scoped to the resource?
* Which authoritative relationship grants access: owner, member, assignee, moderator, admin, share token?
* Can the caller choose subject, tenant, owner, or role in the request?
* Does loading by ID include tenant/owner scope, or check only after retrieval?
* Are list, count, search, export, preview, and attachment paths protected equally?
* What happens after membership revocation, ownership transfer, or resource deletion?
* Can a broad admin role cross tenant boundaries by accident?
* Does denial avoid leaking resource existence or sensitive metadata?

## Attack Patterns

```text
horizontal IDOR: actor A replaces owned resource ID with actor B's
cross-tenant:    tenant A credential supplies tenant B object or parent ID
vertical:        ordinary user invokes moderator/admin operation directly
nested object:   authorized parent ID with unauthorized child/attachment ID
alternate path:  protected detail route; unprotected preview/export/batch route
stale relation:  load while member → revoke → execute cached or queued action
list leakage:    scoped detail; unscoped search/count/report reveals others
verb mismatch:   GET protected; PATCH/DELETE or GraphQL mutation omitted
```

## Evidence Requirements

Provide the access rule and source, two-actor or two-tenant setup where applicable, exact request, response and durable effect, resource ownership/relationship proof, and code/policy path with file/line provenance.

Use the `AGENTS.md` scale. `CONFIRMED` IDOR normally requires actor A accessing B's resource. An exact route plus absent effective check may be `HIGH CONFIDENCE`; a missing local check without tracing middleware or data policy is only `POSSIBLE`.

## False Positives

Verify inherited middleware, database row policies, scoped repository methods, signed capability links, public-resource intent, and authorized support/admin exceptions. A handler need not repeat a check already guaranteed at a shared boundary. Different error codes are not authorization bypasses without unauthorized information or effect. Do not assume sequential IDs alone prove exploitability.

## Output Format

Use `templates/audit-report.md`. Include subject/action/resource/relationship/tenant, invariant, reproduction, expected/actual decision, mechanism, impact, severity, confidence, recommendation, and provenance.

Add an authorization matrix by operation and actor class plus a route coverage ledger. Group routes sharing one missing middleware or query-scope root cause unless impacts differ materially.
