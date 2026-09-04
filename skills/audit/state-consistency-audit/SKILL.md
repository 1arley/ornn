---
name: state-consistency-audit
description: Compares state across database, API, server state, cache, client state, and URL state, and looks for divergences where the layers disagree about what is true.
license: MIT
metadata:
    aes-category: audit
    aes-priority: high
---

# State Consistency Audit

## Objective

Identify authoritative state and verify that database, server, cache, API, client, and URL representations converge without enabling stale decisions, lost updates, or misleading feedback.

## When to Use

Use when state is copied across layers, cached, optimistically updated, encoded in URLs, synchronized asynchronously, or changed by multiple actors. Symptoms include stale views, refresh-dependent fixes, ghost entities, lost updates, flicker, and conflicting tabs.

Focus on disagreement and convergence. Compose with `error-flow-audit` for divergence caused by failure, `race-condition-hunter` for concurrent writes, `user-flow-audit` for navigation effects, and `data-integrity-audit` for canonical persistence constraints.

## Mental Model

For each fact, establish one authority and a propagation graph:

```text
authority → derived copies → invalidation/refresh → convergence
```

Not every mismatch is a bug: eventual consistency permits bounded disagreement. A defect exists when a non-authoritative copy makes an unsafe decision, overwrites newer state, remains stale beyond contract, or tells the user an action succeeded when authority disagrees.

## Investigation Procedure

1. Inventory stateful facts and every representation: database, memory, cache, event stream, API, client store, component state, persisted browser storage, and URL.
2. Name the authority, version/identity, readers, writers, and expected convergence bound for each fact.
3. Map write and propagation paths, including invalidation, optimistic updates, rollback, refresh, reconnect, and background synchronization.
4. Test create/update/delete/restore across refresh, back/forward, multiple tabs, multiple actors, reconnect, and stale submissions.
5. Force delayed, duplicated, missing, and reordered responses or events where safe.
6. Check conflict detection, versioning, merge semantics, and whether stale data can authorize or overwrite.
7. Observe each layer over time and distinguish temporary lag from stable divergence.
8. Record protected paths, convergence time, evidence confidence, and coverage gaps.

## Questions to Ask

* Which representation is authoritative for this fact?
* Can two layers both believe they are authoritative?
* How is identity/version preserved through cache keys, API payloads, and client stores?
* What invalidates each copy after create, update, delete, restore, logout, or tenant switch?
* Can a stale client submit a destructive or privileged action?
* Can an older response or event overwrite a newer one?
* Does optimistic UI roll back every dependent view and side effect?
* What happens across refresh, back/forward, duplicate tabs, offline/reconnect, and account switch?
* What convergence delay is explicitly acceptable and observable?

## Attack Patterns

```text
out-of-order:    request A then B → response B then A → old state wins?
stale submit:    load version 1 → another actor writes v2 → submit v1 → lost update?
cache scope:     tenant A cached key reused after switching to tenant B
delete ghost:    delete authority → cached list/detail still acts on entity
optimistic fail: UI applies mutation → server rejects → one copy remains changed
multi-tab:       tab A logs out/updates → tab B retains authority or stale data
URL conflict:    URL says resource X while store/component shows Y
event disorder:  update event arrives after delete → entity resurrected?
```

## Evidence Requirements

Identify the fact, authority, copies, version/order signal, expected convergence contract, exact event timeline, and observed states at each layer. Demonstrate an unsafe decision, overwrite, persistent divergence, or exceeded bound; include requests/tests or code locations.

Apply the `AGENTS.md` confidence scale. A screenshot of stale UI without authoritative-state evidence is at most `POSSIBLE`. `CONFIRMED` requires an observed timeline and resulting divergence or invariant violation.

## False Positives

Do not report bounded, documented eventual consistency that converges correctly. Verify cache namespaces and invalidation, conditional writes/ETags, monotonic versions, query-library behavior, and optimistic rollback before claiming absence. A deliberate snapshot is not stale if labeled and non-authoritative. Visual transition lag without wrong action or broken contract may be UX feedback, not consistency failure.

## Output Format

Use `templates/audit-report.md`. Include fact/invariant, authority, divergent copies, timeline, reproduction, expected convergence, actual state, mechanism, impact, severity, confidence, recommendation, and provenance.

Add a state map: fact, authority, copies, writers, propagation/invalidation, version control, convergence bound, and tested result. Group multiple stale views caused by one invalidation or keying defect.
