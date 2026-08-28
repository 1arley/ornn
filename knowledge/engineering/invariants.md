# Invariants

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

An **invariant** is a property that must remain true at every observable point of a
system. Software bugs are almost always invariant violations: a rule the system
assumes and then breaks under some input, timing, or state change.

Common forms:

```text
amount >= 0                     (no negative balances)
one charge per payment event    (no duplicate effects)
owner can only edit own rows    (no cross-user mutation)
count == number of rows         (no drift between cache and truth)
every transition has a source   (no impossible states)
```

## Why does it fail

1. **Enforced only in the UI** — a disabled button or hidden field is not a
   constraint; the client is not a trust boundary.
2. **Enforced in one layer only** — application logic is bypassable when the API is
   called directly, another service writes, or a migration runs.
3. **Assumed but not stated** — the invariant exists in someone's head, not in code
   or schema.
4. **Race window** — the check and the enforcement are two separate operations; a
   second request enters between them.
5. **Reversal is not symmetric** — the action grants, the inverse does not undo
   (reward loops, refunds that don't restore stock).
6. **Failure path skips it** — the happy path enforces; the error/retry path does not.

## What invariants matter

For any rule, ask the enforcement questions in order:

```text
Where is it enforced?
Can it be bypassed?
Can it be repeated?
Can it be reversed?
Can it race?
```

An invariant is only real when it survives all five.

## Patterns

- **Database as final authority**: `CHECK`, `UNIQUE`, `FOREIGN KEY`, enums, and
  generated columns prevent impossible states before application logic runs.
- **Derived values**: anything derived (balance, XP, streak) must be recomputable or
  updated atomically with the source event.
- **Write-time validation**: validate invariants at the point of the write, not on
  read or in the UI.
- **Compensation**: when a multi-step flow fails mid-way, a compensating action
  restores the invariant; retry is a form of compensation and must be idempotent.

## What evidence to look for

- The constraint in the schema (or its absence).
- The handler code path that enforces (or skips) the rule.
- A repeated/reversed/concurrent request sequence reproducing the violation.
- The layer that is trusted: if a value is client-supplied, treat it as hostile.

## Related skills

`business-logic-audit` (elicit rules), `data-integrity-audit` (enforce in schema),
`race-condition-hunter` (enforce atomically), `idempotency-audit` (repeat/reversal).
