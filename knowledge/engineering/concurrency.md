# Concurrency

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Concurrency bugs** happen when two or more operations run in overlapping time and
the system's behavior depends on the exact order of execution — the order is not
guaranteed and can change under load. The classic pattern is `READ → DECISION → WRITE`
where the read and write are not atomic.

## Why does it fail

1. **Check-then-act**: read the state, decide based on it, then write. If another
   request writes between the read and the write, the decision is based on stale
   data.
2. **Non-atomic increment**: `balance = balance - price` compiled as three
   operations (read, subtract, write) is not atomic.
3. **Unique check without a constraint**: `if not exists: insert` — two threads
   both pass the check, both insert.
4. **Shared mutable state without a lock**: a counter, a balance, a cache entry, a
   queue — anything that is read and then written by multiple concurrent paths.
5. **Time-of-check to time-of-use (TOCTOU)**: a permission check, then an action
   — a revocation between them is invisible.

## What invariants matter

```text
a read-then-write is atomic
a unique check is a unique constraint
a counter increment is a single atomic operation
two concurrent operations produce the same result as the slowest sequential order
```

## Patterns

- **Conditional atomic write**: `UPDATE ... WHERE balance >= price` — the database
  evaluates the condition and the write atomically.
- **Unique constraint**: `UNIQUE (user_id, coupon_id)` — the second insert fails;
  no application-level check needed.
- **Atomic increment**: `$inc` in MongoDB, `UPDATE counter SET v = v + 1`, Redis
  `INCR` — the database guarantees the operation is atomic.
- **Optimistic locking**: `UPDATE ... WHERE version = read_version` — the second
  writer gets zero rows and can retry or abort.
- **Pessimistic locking**: `SELECT ... FOR UPDATE` — locks the row for the duration
  of the transaction; other writers wait.
- **Idempotency key**: the caller provides a unique key; the server uses a unique
  constraint on the key — the second request with the same key is rejected (or
  returns the prior result).

## What evidence to look for

- The `READ → DECISION → WRITE` sequence in any handler that touches a shared
  resource (balance, stock, counter, queue, permission).
- Database queries without `WHERE` conditions that would reject stale state.
- Absence of unique constraints on columns that should be unique (user+post,
  provider event id, idempotency key).
- Controller-level `synchronized`, `@Lock`, or `atomic` — and whether they are
  scoped to a single process (not enough for multi-instance).

## Related skills

`race-condition-hunter` (find the pattern), `idempotency-audit` (defend against
repeat), `data-integrity-audit` (constraint-based defense),
`business-logic-audit` (invariant under concurrency).