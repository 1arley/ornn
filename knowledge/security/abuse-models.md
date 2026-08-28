# Abuse Models

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

An **abuse model** treats the API as directly accessible. The user does not click
buttons; they call endpoints, repeat requests, change ids, add fields, and bypass the
UI entirely. Abuse is not "unexpected behavior" — it is a predictable class of
operation an adversarial caller will try.

Core categories:

```text
repetition   replay   id manipulation   extra fields   alternative endpoints
rate / quota bypass   UI bypass   privilege escalation
```

## Why does it fail

1. **UI is the only gate** — a disabled button or hidden form field is not
   enforcement; the endpoint is still reachable.
2. **No rate limiting / quota enforcement server-side** — the client can call
   until it succeeds; the UI shows a counter but the server never counts.
3. **IDs are guessable and accepted** — sequential integer ids let a caller walk
   the entire collection (IDOR).
4. **The happy path is the only path** — the server validates on the happy path
   but not on error, retry, or alternate field combinations.
5. **Idempotency is missing** — replay of the same request has the same effect
   again (double charge, duplicate reward, duplicate creation).
6. **Alternative endpoints** — the same operation exposed through a different
   route with weaker checks.

## What invariants matter

```text
every rate/quota limit is enforced server-side
every write is idempotent under replay (or has a unique key)
every id reference is validated and owned
every operation is reachable only through the intended, checked path
```

## Patterns

- **Server-side counters**: quota/rate-limit checks read persistent state, not the
  client's claim of usage.
- **Unique constraints as abuse defense**: a unique ledger key, a unique
  (user, post) reaction, a unique provider event id — the database rejects replay.
- **Idempotency keys**: the client provides a key; the server rejects the second
  use.
- **Rate limiting at the gateway + app**: defense in depth; both use the same
  identity and both are configured for the actual limits.
- **Opaque, non-sequential ids**: UUIDs where enumeration is a risk; ownership
  checks on every reference.

## What evidence to look for

- Endpoints that read only from the URL/body without server-side counters.
- Rate-limit middleware configured for the route or missing entirely.
- Unique constraints on repeatable side-effect tables.
- Whether the API rejects extra/unknown fields or ignores them (reject = better).
- Whether an alternative endpoint with weaker checks exists.

## Related skills

`api-abuse-audit` (the API as directly accessible), `idempotency-audit` (replay
defense), `authorization-audit` (id enumeration), `input-trust-audit` (extra fields),
`edge-case-hunter` (boundary values).