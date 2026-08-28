# Authorization

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Authorization** answers *can this identity perform this action on this resource?*
It is distinct from authentication (*who is this?*). A system that checks only that
a request is authenticated — not whether the caller is allowed — is only half
protected.

Layered model:

```text
anonymous  <  authenticated  <  authorized  <  owner/moderator/admin
```

The failure class is `IDOR` (insecure direct object reference) and privilege
escalation: authenticated user A acting on user B's resource.

## Why does it fail

1. **AuthN confused with AuthZ** — "requires login" is treated as "anyone may act."
2. **Ownership not checked** — the handler loads by id without adding
   `WHERE account_id = session.account_id`.
3. **Check on the client** — the UI hides buttons; the API still allows.
4. **Check in the wrong layer** — middleware guards some routes; the new route
   forgets it; a sub-resource route checks the parent but not the child.
5. **Only on read, not on write** — `GET` checks ownership; `DELETE` or `PUT` does not.
6. **Object-level vs route-level** — route-level authz (`isAdmin` on the route)
   does not protect object-level access (this file is mine).
7. **IDOR via secondary keys** — the primary id is checked, but an alternate
   reference (invoice number, email, external id) is not.

## What invariants matter

```text
every resource access enforces authorization on the server
ownership is derived from the session, never from the client
permission checks cover reads AND writes AND sub-resources
a direct object reference is resolved against the caller's own set
```

## Patterns

- **Server-side ownership predicates**: `WHERE id = ? AND owner_id = ?`.
- **Centralized policy**: a single `can(actor, action, resource)` function instead
  of scattered conditionals.
- **Hierarchical checks**: parent resource ownership implies child resource rules;
  verify both when relevant.
- **Deny by default**: an unhandled route or missing policy denies; fail closed.
- **IDs as opaque values**: never expose or trust global ids; resolve them in the
  context of the session.

## What evidence to look for

- The route → handler → query chain for each resource; whether the session identity
  reaches the query.
- `req.user.id` vs a client-supplied `userId`/`id` in the same query.
- Middleware coverage: which routes it protects and which it misses.
- The permission model: roles in the session vs roles checked at the resource.

## Related skills

`authorization-audit` (find the gaps), `api-abuse-audit` (direct API access),
`input-trust-audit` (client-supplied identity), `business-logic-audit` (ownership
rules).