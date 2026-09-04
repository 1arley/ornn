---
name: race-condition-hunter
description: Hunts for non-atomic decisions over shared mutable state and proves invariant violations with controlled interleavings, including lost updates, write skew, double spend, oversell, and duplicate grants.
license: MIT
metadata:
    aes-category: reliability
    aes-priority: high
---

# Race Condition Hunter

## Objective

Find shared-state decisions whose correctness depends on timing, model a violating interleaving, and verify whether the real storage and isolation boundaries preserve the invariant under concurrency.

## When to Use

Use this skill when two or more requests, workers, transactions, tabs, or services can observe and mutate related state concurrently. Prioritize balance, inventory, quotas, uniqueness, grants, votes, counters, scheduling, and ownership transitions. Trigger it for concurrency, TOCTOU, intermittent duplicates, oversell, double spend, lost update, write skew, and check-then-act behavior.

Do not use it for failures that occur sequentially with no shared mutable state. Compose with `data-integrity-audit` for database defenses, `idempotency-audit` when duplicate logical operations are involved, `business-logic-audit` to establish the invariant, `state-consistency-audit` for stale copies, and `gamification-audit` for concurrent reward abuse. Report under the race skill when timing-dependent interleaving is the root cause; cross-reference rather than duplicate.

## Mental Model

A race exists when correctness depends on an ordering the system does not guarantee:

```text
shared state S satisfies invariant I
A observes S ---- B observes S
A decides      -- B decides
A writes       -- B writes
final state or emitted effects violate I
```

Look beyond simple read/modify/write. Lost updates overwrite work; check-then-act duplicates effects; write skew lets transactions update different rows after reading a shared predicate; stale caches and replicas widen observation gaps. A transaction is not automatically safe: actual isolation, lock scope, query shape, connection boundaries, retries, and external effects determine protection.

Valid defenses include a single atomic conditional statement, compare-and-swap with checked failure, correctly scoped row/advisory locks, a unique or exclusion constraint, serialization, or a queue/actor that truly owns the key. Verify the defense on the deployed datastore rather than recognizing its name.

## Investigation Procedure

1. State the invariant precisely and identify the shared records, keys, predicates, caches, and external effects that participate.
2. Enumerate all concurrent actors and entry points, including jobs and alternate APIs, and establish whether they share the same coordination boundary.
3. Trace observations, decisions, writes, commits, and effects. Record transaction boundaries and database isolation.
4. Construct the smallest interleaving in which both actors make locally valid decisions from compatible snapshots but the combined result violates the invariant.
5. Inspect defenses and their scope: conditional predicates, affected-row checks, locks, constraints, serialization retries, queue partition keys, and external idempotency.
6. Build a deterministic test with barriers or hooks around the critical window. Avoid relying on a high-volume timing lottery when synchronization is possible.
7. Run enough controlled trials to distinguish a real interleaving from test noise. Capture inputs, timestamps/order, transaction outcomes, emitted effects, and final authoritative state.
8. Repeat against alternate writers and realistic isolation/configuration. Verify that error and retry handling does not turn safe rejection into duplication.
9. Recommend the narrowest correct defense and add a regression test that forces the interleaving.

## Questions to Ask

* What invariant must hold before and after both operations commit?
* Which actors can access the same logical state, and do they use the same database, lock namespace, or queue partition?
* Which observations drive the decision, and can either become stale before commit?
* Is this a lost update, check-then-act, write skew, duplicate effect, or stale-copy race?
* What isolation level is effective, and does the query acquire the intended lock?
* Does a conditional update check affected rows and retry/reject correctly?
* Does the constraint cover the right composite or tenant scope?
* Are locks held through commit and released on every failure path?
* Can external effects escape before conflict detection or transaction commit?
* Can automatic retries re-run non-idempotent logic?

## Attack Patterns

```text
lost update
    A reads count=10; B reads count=10
    A writes 11; B writes 11 -> one increment disappears

double spend or oversell
    A and B both observe sufficient balance/stock
    both emit value before either makes the condition false

check-then-insert
    A and B both observe no row for key K
    both insert K -> duplicate unless authoritative uniqueness rejects one

write skew
    A and B read predicate "at least one approver remains"
    each disables a different approver -> predicate becomes false

quota or reward grant
    synchronize requests after eligibility check
    both grant before usage/dedup state is atomically claimed

lock-scope mismatch
    service A locks local key K; service B uses another process/namespace
    both enter the critical section

conflict plus retry
    datastore rejects B, but retry repeats an already emitted external effect
```

Use disposable state and bounded concurrency. Do not stress production or perform financial/irreversible operations without explicit authorization.

## Evidence Requirements

Name the invariant, actors, shared state, actual isolation/configuration, and exact interleaving. Show the critical observation and write/effect for each actor, the defense that is absent or ineffective, and the authoritative final state. Distinguish final stored state from external effects; either may violate the invariant.

`CONFIRMED` requires a controlled or reliably reproduced interleaving with observed invariant violation. `HIGH CONFIDENCE` requires a reachable timing-independent code/storage proof and a complete violating schedule. `POSSIBLE` means actor overlap, configuration, or outcome is unresolved. `SPECULATIVE` is not blocking. Static read-then-write shape alone is insufficient if an effective downstream constraint closes the window.

## False Positives

Do not report a race merely because code contains multiple statements or a transaction. Verify concurrent reachability and the effective defense. Atomic increments, correctly checked conditional updates, properly scoped locks, and authoritative constraints may preserve the invariant. Conversely, do not dismiss a race because a transaction exists without checking isolation. A soft quota may permit bounded overshoot by design; compare against the explicit error budget. Per-key state that cannot overlap is not shared. A flaky concurrency test without captured interleaving is evidence to investigate, not confirmation. Duplicate logical requests with no timing dependency belong primarily to `idempotency-audit`.

## Output Format

Use `templates/audit-report.md` for each distinct invariant violation. Include invariant, actors and entry points, effective isolation, synchronized reproduction, interleaving, final state/effects, root cause, impact, evidence level, provenance, and the proposed atomicity mechanism plus regression test.

```text
actor A | actor B | observation | decision | write/effect | commit/order
```

Prioritize money, entitlements, inventory, authorization, and irreversible effects before counters or cosmetic drift. Cross-reference integrity, idempotency, and state-consistency findings.
