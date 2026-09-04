---
name: edge-case-hunter
description: Generates edge cases around null, empty, zero, negative, huge values, duplicates, Unicode, stale data, deleted data, expired data, and repeated valid actions, then checks whether the system handles each.
license: MIT
metadata:
    aes-category: audit
    aes-priority: high
---

# Edge Case Hunter

## Objective

Derive high-value boundary and exceptional cases from actual types, invariants, and lifecycle, then verify whether each is rejected, normalized, or handled consistently.

## When to Use

Use when a flow accepts user or external input, crosses type or serialization boundaries, has limits or lifecycle states, imports data, or fails around empty, extreme, duplicate, Unicode, stale, deleted, or expired values.

Do not generate a generic Cartesian checklist for fields that cannot influence behavior. Compose with `business-logic-audit`, `input-trust-audit`, `data-integrity-audit`, `state-consistency-audit`, and `error-flow-audit` as their boundaries apply.

## Mental Model

An edge case is near a semantic boundary, not merely unusual. Derive cases as:

```text
domain → equivalence classes → boundaries → representation changes → lifecycle states
```

High-value cases occur where layers disagree: absent versus null, bytes versus characters, local versus UTC time, integer versus floating point, deleted versus missing, duplicate request versus entity, or stale versus current state.

## Investigation Procedure

1. Inventory inputs and states from schemas, types, validators, database definitions, API contracts, and UI constraints.
2. State the invariant and expected handling for each relevant field or state.
3. Partition domains: absent/null/empty; zero/negative/min/max/overflow; duplicate; malformed; Unicode; temporal boundary; stale/deleted/expired; repeated action.
4. Prioritize boundaries that cross layers, affect authority or value, or trigger irreversible effects.
5. Trace validation and normalization through client, transport, server, persistence, and integrations.
6. Test immediately below, at, and above each meaningful boundary; include repetition or concurrency only when semantics change.
7. Observe response, persisted state, side effects, logs, and retry behavior.
8. Compare with the contract, classify evidence, and record untested partitions.

## Questions to Ask

* Are missing, `null`, empty string, whitespace-only, and empty collection distinct?
* Is zero valid, absent, or false? Are negative values meaningful?
* What happens at min-1/min/min+1 and max-1/max/max+1?
* Are limits measured in bytes, code points, graphemes, rows, or serialized size?
* How are Unicode normalization, combining marks, emoji, bidi controls, and case folding handled?
* What defines duplicate identity, and where is uniqueness enforced?
* Which timezone and clock define expiry, reset, and inclusive boundaries?
* What happens when referenced data is stale, deleted, or expires mid-flow?
* Does repetition remain valid, become idempotent, or duplicate effects?

## Attack Patterns

```text
presence:       omit | null | "" | "   " | [] | {}
numeric:        -1 | 0 | 1 | limit-1 | limit | limit+1 | huge | NaN/Infinity
text:           max-length ±1 | Unicode variants | emoji | bidi | NUL
duplicate:      same logical value with case, whitespace, or Unicode variants
temporal:       just before/at/after expiry or reset; DST boundary
lifecycle:      load entity → delete/expire elsewhere → submit stale mutation
serialization:  number as string; duplicate keys; unknown field; truncation
repeat:         same valid request multiple times → duplicate side effect?
```

## Evidence Requirements

Tie every finding to a contract or invariant. Show exact input/state, path, expected handling, observed response, persisted result, and side effects. Provide file/line evidence or a reproducible test/request.

Use the `AGENTS.md` confidence scale. An untested inferred boundary is at most `POSSIBLE`; `CONFIRMED` requires observed behavior. Verify framework parser behavior against project configuration and version.

## False Positives

Do not report intentionally equivalent representations after canonicalization, documented coercion, harmless message differences, or impossible values rejected before the application boundary. Verify framework and database defaults. Unicode variation is not a defect unless it violates identity, uniqueness, display, security, or product semantics. A theoretical huge input is not actionable without reachability or resource impact.

## Output Format

Use `templates/audit-report.md`. Include invariant, boundary dimension, exact case, reproduction, expected/actual behavior, affected layers, mechanism, impact, severity, confidence, recommendation, and provenance.

Add a coverage matrix by input/state and partition with `tested-pass`, `tested-fail`, `protected`, `not applicable`, or `untested`. Group equivalent failures by root cause.
