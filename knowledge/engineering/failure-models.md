# Failure Models

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **failure model** describes what happens when a multi-step operation fails in the
middle. The interesting cases are not "the request failed" but "the request failed
after some side effects already happened." The system must be able to answer: what is
the state after a partial failure, and is it consistent?

```text
partial success   timeouts   lost responses   retries   crashes   rollback failures
```

## Why does it fail

1. **No compensation**: a side effect committed before the failure is never undone
   (inventory decremented, XP granted, email sent, payment charged).
2. **Retry re-runs everything**: the retry repeats the side effect instead of
   resuming or being idempotent.
3. **Timeout ambiguity**: a timeout does not mean "did not happen" — it means
   "unknown." Treating a timeout as failure can double-charge; treating it as
   success can lose an order.
4. **Lost response**: the server committed but the client never received the
   response; the client retries and the server duplicates.
5. **Crash between steps**: no durable marker of progress exists, so restart cannot
   resume or clean up.
6. **Rollback is not actually rollback**: the compensating action itself fails, or
   was never implemented.

## What invariants matter

```text
a partial failure leaves no committed side effect without a recorded counterpart
a retry is safe (idempotent or reuses the prior result)
the system can distinguish first attempt from retry
progress is durable (an outbox or journal) so crashes resume cleanly
```

## Patterns

- **Idempotency everywhere**: keys for payments, webhooks, notifications,
  creation; look up the key before acting; store the result.
- **Outbox / journal**: persist intent and progress in the same transaction as the
  effect; a worker completes the rest.
- **Compensation / saga**: each step has a compensating action; failure triggers the
  chain in reverse order.
- **Timeout classification**: `PROCESSING` as a distinct state so "unknown" is not
  guessed; the client polls or the server resolves.
- **Best-effort vs required**: mark side effects as required (must be transactional)
  or best-effort (may be lost, retried separately).

## What evidence to look for

- Where a commit/send/enqueue happens relative to the failure-prone step.
- Whether a retry path re-executes side effects.
- Whether timeouts are mapped to success, failure, or unknown.
- A journal/outbox/ledger table or the absence of one.
- The compensating action for each side effect (or its absence).

## Related skills

`error-flow-audit` (map failure points), `idempotency-audit` (safe retry),
`data-integrity-audit` (durable state), `state-consistency-audit` (divergence after
failure).