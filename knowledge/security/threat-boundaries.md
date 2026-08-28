# Threat Boundaries

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **threat boundary** is the line between trusted and untrusted data. Every piece of
data has an origin: the session (trusted-ish), the database (trusted), the request
body (untrusted), a webhook payload (untrusted unless verified), a cache (untrusted
for identity), an external service response (untrusted for correctness).

Bugs appear when data crosses a boundary and is treated as if it came from a more
trusted side.

## Why does it fail

1. **Webhook payloads assumed authentic** — a `POST /webhooks/...` with a
   provider-looking JSON is treated as the provider; no signature check.
2. **Cache trusted for decisions** — a cached value (balance, role, price) is used
   for a decision that affects money or access without re-validating the source.
3. **External service output trusted** — the response from a third-party API is
   assumed to be well-formed and authorized, without validation.
4. **Client-side state as truth** — the frontend holds a copy of the user's role or
   balance and the server trusts a callback that carries it.
5. **Cross-service identity** — a service accepts an `X-User-Id` header from
   another internal service; if the boundary is porous, any caller can impersonate.

## What invariants matter

```text
identity enters the system only through the session/authorization layer
external inputs (webhook, third-party response, cache) are validated before use
a trust boundary change is explicit, not implicit
internal services authenticate each other (mTLS, service tokens, not raw headers)
```

## Patterns

- **Validate at the boundary**: parse, schema-validate, and authorize external
  input immediately; never carry raw payloads into trusted code.
- **Webhook signature verification**: compute the HMAC and compare; reject
  mismatches; replay protection via event id ledger.
- **Cache-as-cache**: caches may serve reads, but decisions that change state must
  re-validate against the source of truth.
- **Explicit trust annotations**: internal calls use a real identity system;
  header-based impersonation is treated as untrusted.
- **Fail closed**: when validation cannot run (key missing, malformed), deny rather
  than proceed.

## What evidence to look for

- Endpoints that process payloads without authentication/verification.
- Use of `X-User-Id`, `X-Forwarded-For`, or role headers from untrusted hops.
- Reads of cached identity/role/balance in decision paths.
- Third-party responses used directly in writes without schema validation.

## Related skills

`api-abuse-audit` (forged payloads), `input-trust-audit` (untrusted fields),
`authorization-audit` (identity boundaries), `state-consistency-audit` (cache as
truth).