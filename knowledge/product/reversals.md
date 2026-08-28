# Reversals

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **reversal** is the operation that undoes a prior action. The fundamental property
of a reversal is whether it is *symmetric*: does the reverse action fully restore the
state that existed before the forward action? If not, the gap is a farming or
inconsistency vector.

```text
add reaction → grant XP   → remove reaction → deduct XP?   (symmetric)
add stock    → decrement  → cancel order     → restore?     (symmetric)
charge       → +balance on merchant → refund → -balance?    (symmetric)
create order → reserve stock       → cancel   → unreserve?  (symmetric)
```

## Why does it fail

1. **Reversal not implemented**: the forward action has no corresponding reverse;
   the data is left in a permanent odd state.
2. **Reversal only partially implemented**: the reverse reduces a counter but does
   not remove the ledger row, leaving the trigger available for a second grant.
3. **Reversal is not atomic**: the reverse action fails mid-way; the forward effect
   is partially undone.
4. **Reversal is not checked for ownership**: anyone can reverse another user's
   action.
5. **Reversal creates a race**: two concurrent reversals both fire; the second
   creates a negative balance or a duplicate compensation.
6. **Reversal is not idempotent**: calling reverse twice produces two undo effects.

## What invariants matter

```text
a forward action has a defined reverse action
the reverse is symmetric and atomic
the reverse is idempotent (second call is a no-op)
the reverse is scoped to the same user and resource
```

## Patterns

- **Compensating ledger entry**: every forward ledger row has a reverse row with a
  reference to the original; the balance is the sum of both.
- **Reversal as a state machine transition**: `granted → reversed` is a valid
  transition; calling reverse from `reversed` is a no-op.
- **Idempotent reversal**: the reverse handler checks the current state before
  acting; if already reversed, return the prior result.
- **Ownership check on reversal**: the reverse action verifies the same user who
  performed the forward action.

## What evidence to look for

- The handler for the reverse action: does it exist? Does it touch the same
  entities as the forward action?
- The balance after a forward-reverse-roundtrip: is it zero?
- The ledger: does the reverse create a compensating row? Can the same trigger be
  reused after reversal?
- The concurrency test: two simultaneous reversals.

## Related skills

`gamification-audit` (reward loops), `business-logic-audit` (reversal rule),
`idempotency-audit` (repeat reversal), `race-condition-hunter` (concurrent
reversal), `user-flow-audit` (the state machine).