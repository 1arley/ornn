# Rewards and Ledgers

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **reward ledger** records every debit and credit to a user's balance (XP, points,
coins, reputation) as individual rows. A ledger is the only reliable way to prevent
farming, replay, and reversal bugs. A simple counter (`UPDATE users SET xp = xp + 10`)
has no history and cannot be audited or reversed.

The **TRIGGER → CONDITION → REWARD → REVERSAL** model:

```text
TRIGGER:    user reacts to a post
CONDITION:  user has not reacted to this post before
REWARD:     +10 XP to the post author
REVERSAL:   remove reaction → -10 XP (compensating ledger entry)
```

A farming loop exists when the reversal does not fully undo the reward.

## Why does it fail

1. **No ledger**: a scalar counter is updated directly; no source rows exist.
2. **Reversal is not symmetric**: the forward action grants, the reverse does not
   deduct; or it deducts a different amount.
3. **No unique constraint on the trigger**: the same user can react to the same post
   multiple times, each granting XP.
4. **Self-reward not blocked**: react to own content or use a secondary account to
   trigger the reward.
5. **Concurrent reward**: two simultaneous triggers both pass the existence check
   and both grant.
6. **Referral without proof**: the referrer is trusted by client-supplied id; the
   invitee can be the same person.

## What invariants matter

```text
every reward is backed by a ledger row with a unique trigger id
the reversal of a reward creates a compensating ledger row
a unique constraint prevents double-grant from the same trigger
self-reward is rejected server-side by comparing the reward target to the grantee
```

## Patterns

- **Ledger table**: `CREATE TABLE xp_ledger (id, user_id, amount, trigger_type,
  trigger_id, created_at, UNIQUE(trigger_type, trigger_id))`. The unique constraint
  is the defense against replay and concurrency.
- **Compensating entries**: reversal creates a negative amount row with a reference
  to the original trigger; the balance is a `SUM` of the ledger.
- **Server-side ownership check**: `trigger.author_id != session.user_id`. The
  client never tells the server who owns the reward target.
- **Idempotency key or ledger key**: a unique key for each trigger prevents
  duplicate grant without race conditions.

## What evidence to look for

- The balance column in the user table vs a ledger table.
- The reverse action handler: whether it deducts or not.
- The unique constraint on the trigger: `(trigger_type, trigger_id)`.
- The self-reward check: `WHERE author_id != session.user_id`.
- The concurrency test: two simultaneous triggers against the same target.

## Related skills

`gamification-audit` (abuse model), `business-logic-audit` (rules),
`idempotency-audit` (replay), `race-condition-hunter` (concurrent grant),
`api-abuse-audit` (UI bypass), `input-trust-audit` (client-supplied target).