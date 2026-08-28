# Input Trust

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Input trust** is the principle that the server must derive its own truth from the
session and the database — not from the client's request payload. A client is a
hostile environment; every field the client sends is a suggestion, not a fact.

The pattern of failure is **mass assignment** or **client-supplied control**: the
request carries a value the server trusts and uses directly, such as `role`, `price`,
`userId`, `isPremium`, `owner_id`, `status`, `xp`.

## Why does it fail

1. **Client supplies identity**: `userId` in the request body is used to filter
   data or authorize action. The attacker changes it to another user's id.
2. **Client supplies price**: the browser sends the product price; the server
   charges it without consulting the catalog.
3. **Client supplies role/permission**: the request includes `role: "admin"`; the
   server inserts it directly into the user record.
4. **Client supplies status**: `status: "paid"` is sent; the server marks the
   invoice paid without verifying payment.
5. **Client supplies ownership**: `owner_id: "target"` is accepted; the attacker
   transfers a resource to themselves.
6. **Client supplies timestamps**: `created_at` or `expires_at` from the client
   allows extending or faking time windows.

## What invariants matter

```text
the server derives identity from the session, not the body
the server derives price/role/status from the database, not the request
the server derives timestamps from the server clock, not the client
every field that affects another user's state is server-validated
```

## Patterns

- **Allowlist, not blocklist**: define which fields the client may set; reject
  everything else (`Object.assign` is dangerous; a spread of the body is dangerous).
- **DTO projection**: map the request body to a DTO with only the permitted fields;
  `req.body` itself is never passed to the database update.
- **Server-side derivation**: look up `role` from the session membership, `price`
  from the catalog, `userId` from the JWT/session, `status` from the last valid
  transition.
- **Read-after-write**: after writing, re-read the record and compare critical
  fields to the expected values (defense in depth).

## What evidence to look for

- `req.body` (or `request.body`, `json.loads(request.body)`) directly used in a
  database write or a permission check.
- Fields that should be read-only (userId, role, price, status, created_at) in the
  request schema or documentation.
- Mass assignment library configuration (allowed/denied columns).
- Server-side catalog lookups or hardcoded values for price and access control.

## Related skills

`input-trust-audit` (audit the field), `api-abuse-audit` (bypass the UI),
`authorization-audit` (client-supplied identity), `business-logic-audit` (price
derivation).