---
name: data-integrity-audit
description: Verifies that the deployed data model, write boundaries, and database enforcement prevent structurally invalid or partially committed states across every writer.
license: MIT
metadata:
    aes-category: reliability
    aes-priority: high
---

# Data Integrity Audit

## Objective

Determine whether the authoritative data store prevents impossible persistent states, rather than relying on one application path to preserve invariants that other writers or concurrent operations can violate.

## When to Use

Use this skill for systems that persist relational or structured data, especially when the domain depends on uniqueness, required fields, bounded values, valid references, controlled state domains, atomic multi-record changes, deletion policies, or several writers. Trigger it for duplicates, orphaned records, invalid states, partial writes, migration drift, or soft-delete collisions.

Do not use it as a generic database performance review or demand that every business rule become a constraint. Rules involving external systems, time, aggregate history, or policy may belong in transactional application logic. Compose with `race-condition-hunter` for concurrent violations, `idempotency-audit` for deduplication keys, `error-flow-audit` for failure boundaries, `business-logic-audit` for discovering invariants, and `state-consistency-audit` for disagreement between stores. Keep one primary finding owner and cross-reference overlaps.

## Mental Model

Treat integrity as explicit predicates over committed data:

```text
valid state before write + attempted write + authoritative enforcement
    -> valid state after commit, or atomic rejection
```

Ask whether the invariant is real, whether the database can appropriately express it, and whether the deployed schema enforces it for every writer. Use constraints for structural truths: `NOT NULL`, types, `CHECK`, unique keys, foreign keys, exclusion constraints, and deliberate delete actions. Use transactions, locking, or conditional writes for multi-step transition invariants. Use workflow controls where a rule crosses data stores or external systems. A migration file is intent; effective schema and observed behavior are evidence.

## Investigation Procedure

1. Identify the authoritative store, database/version, effective schema, applied migrations, and all writers: APIs, jobs, imports, admin tools, scripts, and services.
2. Derive concrete invariants from product behavior and code. Express each as an allowed or forbidden state, including scope and lifecycle.
3. Classify each invariant as row-local, unique, referential, cross-row, transition, deletion-related, or cross-system. Decide which layer can enforce it without changing valid behavior.
4. Inspect effective DDL and indexes, including predicates, null and collation semantics, deferrability, and delete/update actions. Do not rely on ORM declarations alone.
5. Trace all write paths and check whether raw SQL, bulk operations, disabled constraints, or other services bypass enforcement.
6. For multi-write transitions, map commit boundaries and failure points. Verify that writes which must succeed together share an effective transaction and that external effects have recovery.
7. In a disposable environment, test forbidden inserts, updates, deletes, soft-delete lifecycles, and concurrent attempts through relevant writers and at the database boundary.
8. Check existing data and assess migration, lock, downtime, and rollback implications before recommending a constraint.
9. Consolidate overlaps by violated invariant and distinguish product ambiguity from enforcement failure.

## Questions to Ask

* What exact state is impossible, and what product evidence establishes that invariant?
* Which store is authoritative, and is the inspected schema actually deployed?
* Does uniqueness have the correct columns, tenant scope, case/collation behavior, null behavior, and soft-delete predicate?
* Can a reference be missing, deleted, deferred, disabled, or cross-tenant? Is its delete/update action intentional?
* Are required values protected by `NOT NULL`; do defaults mask missing input?
* Do domain constraints cover every valid value without preventing legitimate evolution?
* Which writes must commit together, and do nested transactions or separate connections break the boundary?
* Can any writer create the forbidden state?
* Will a proposed constraint reject existing data or require an unsafe migration?

## Attack Patterns

```text
scoped uniqueness
    create the same key across and within tenants
    compare the observed behavior with the required scope

soft-delete lifecycle
    create key=x -> soft delete -> create or restore key=x
    detect blocked legitimate reuse or two visible active rows

referential violation
    create/update a child with a missing, deleted, or cross-tenant parent
    delete the parent and observe RESTRICT/CASCADE/SET NULL behavior

invalid domain
    insert/update null, negative quantity, reversed range, or unknown status
    compare API rejection with direct database enforcement

partial commit
    fail between writes implementing one invariant
    inspect committed rows after rollback and retry

concurrent uniqueness
    synchronize two inserts after their pre-check, then release both
    inspect commits, errors, and final row count

schema drift
    compare expected migration state with effective production-like DDL
    test the invariant against the effective schema
```

Never run destructive probes against production data. Prefer disposable databases, rollback-safe transactions, or read-only structural proof.

## Evidence Requirements

Name the invariant, scope, authoritative boundary, relevant writers, and expected enforcement. Cite effective DDL or transaction paths and show the smallest operation or interleaving that produces the forbidden committed state. Record database/version and preconditions because null, collation, isolation, and constraint behavior vary.

Use the repository evidence scale: `CONFIRMED` requires an observed forbidden committed state or accepted violating write in a representative environment; `HIGH CONFIDENCE` requires an exact reachable writer plus concrete missing or ineffective enforcement; `POSSIBLE` means reachability, invariant, or deployed state remains incomplete; `SPECULATIVE` is a hypothesis and never a blocking bug. Missing constraints alone are not findings until invariant, reachability, and impact are established.

## False Positives

Do not report a missing constraint when the invariant is not a product rule, the database cannot appropriately own it, or a verified single boundary enforces it atomically for every writer. Do not infer deployed drift from an old migration. Application validation beside a constraint is defense in depth. Free-form statuses, nullable references, global uniqueness, identifier non-reuse, deferred constraints, and eventual cleanup can be intentional; verify the lifecycle. A temporary uncommitted state is not an integrity defect unless observable or committed. Treat hardening without a demonstrated failure as an improvement, not a confirmed bug.

## Output Format

Use `templates/audit-report.md` for each distinct violated invariant. Include scope, affected tables/columns and writers, effective enforcement, reproduction, committed before/after state, root cause, impact, evidence level, provenance, and a recommendation with migration and compatibility considerations.

```text
invariant | scope | authoritative store | writers | enforcement | test result | status
```

Prioritize corruption, cross-tenant references, financial/value invariants, and irrecoverable cascades. Cross-reference related race, failure, or business-logic findings instead of duplicating them.
