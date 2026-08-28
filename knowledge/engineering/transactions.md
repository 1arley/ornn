# Transactions

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **transaction** groups operations so they either all commit or all abort. The ACID
properties are the standard: atomicity, consistency, isolation, durability. Most
multi-step endpoints in web applications span a transaction, even if the database
kills it when two clients write the same row.

## Why does it fail

1. **No transaction at all** — each operation uses its own connection; the first
   commits, the second fails, and the system is left in a partial state.
2. **Read-modify-write without isolation** — two transactions read the same value,
   both decide to act, and the second write overwrites the first (lost update).
3. **External service inside a transaction** — the transaction holds locks while
   waiting for an HTTP call; retry or timeout may leave the call in an unknown
   state while the transaction rolls back.
4. **Non-transactional side effect** — a success branch modifies a cache, sends a
   notification, or enqueues a job; the transaction rolls back but the side effect
   already committed.
5. **Optimistic concurrency without a version** — the application does not carry a
   version column, so two concurrent updates silently overwrite each other.

## What invariants matter

```text
operation is atomic: either all steps persist or none do
isolation is serializable: concurrent operations produce the same result as sequential
compensation is transactional: if the reversal is designed, it must also be atomic
```

## Patterns

- **Conditional atomic update**: `UPDATE ... SET balance = balance - price WHERE
  balance >= price` prevents the read-then-write window. The database guarantees
  atomicity for the single statement.
- **Optimistic locking**: a version column (`ROWVERSION`, `updated_at`, `_version`)
  rejects stale writes. Read the version, write with `WHERE version = read_version`.
- **Transaction per request**: wrap the entire request in one transaction. For
  external-service calls, commit before the call or use a saga pattern.
- **Outbox pattern**: write the event to a local table within the same transaction
  as the data change; a separate process reliably publishes it. This avoids the
  dual-write problem.
- **Saga for long flows**: a sequence of local transactions with compensating
  actions. Each step publishes an event; the next step subscribes; a failure
  triggers the compensation chain.

## What evidence to look for

- The database connection lifecycle: shared or separate per operation.
- Transaction boundaries in the handler: `@Transactional`, `START TRANSACTION`,
  `session.beginTransaction()`, or none.
- Retry behavior: whether a failed step retries inside or outside the transaction.
- External calls inside transaction scope (HTTP, email, notification, queue).
- Version column usage in the schema.

## Related skills

`data-integrity-audit` (constraints), `race-condition-hunter` (read-modify-write),
`error-flow-audit` (partial failure), `business-logic-audit` (invariant enforcement).