---
name: adversarial-review
description: Teaches the agent to attack the system as curious, malicious, power, careless, competitor, and stale-state users using repeat, reverse, reorder, skip, replay, concurrent, and manipulate operations.
license: MIT
metadata:
    aes-category: audit
    aes-priority: high
---

# Adversarial Review

## Objective

Turn hidden product and engineering assumptions into testable abuse hypotheses by combining user personas with adversarial operations. Generate and triage hypotheses; never promote an unverified suspicion to a bug.

## When to Use

Use before launching or refactoring a non-trivial stateful flow, especially one involving permissions, money, rewards, inventory, quotas, or counters. Also use for broad requests to audit, attack, stress-test, or explain what could go wrong.

Do not substitute it for a focused investigation when the defect class is known. Compose with `business-logic-audit`, `edge-case-hunter`, `race-condition-hunter`, `state-consistency-audit`, `error-flow-audit`, `authorization-audit`, `idempotency-audit`, or `api-abuse-audit` to verify relevant hypotheses. Preserve one consolidated finding when several skills expose the same root cause.

## Mental Model

A conventional review follows the intended path; an undirected bug hunt produces noise. Model each candidate as:

```text
assumption + reachable actor + operation + observable invariant violation
```

Personas are pressure models, not demographics: a curious user probes hidden inputs; a malicious user violates protocol; a power user bypasses documented sequencing; a careless user leaves flows incomplete; a competitor automates extraction or economic abuse; a stale-state user acts on outdated client state.

Apply `repeat`, `reverse`, `reorder`, `skip`, `replay`, `concurrent`, and `manipulate`. A persona-operation pair remains a hypothesis until reachability, mechanism, and impact are established.

## Investigation Procedure

1. Map actors, entry points, preconditions, transitions, effects, and trust boundaries.
2. State each assumption as an invariant with an observable violation condition.
3. Enumerate reachable alternatives, including direct API access and stale or forged client state.
4. Apply relevant persona-operation pairs; skip combinations that cannot affect the invariant.
5. Triage by reachability, impact, and existing controls. Record why discarded hypotheses are impossible or protected.
6. Delegate verification to the narrow specialist when appropriate; otherwise reproduce the sequence or trace the exact code path.
7. Check product intent and compensating controls before assigning confidence and severity.
8. Consolidate by root cause and report coverage, including tested hypotheses that held.

## Questions to Ask

* What must remain true before and after each action?
* Which actor can reach the operation without cooperating with the UI?
* Which hidden fields, IDs, roles, timestamps, or values does the server accept?
* What accumulates when an action repeats, reverses, or is retried after a lost response?
* Can callers skip or reorder prerequisite steps?
* Can two actors pass the same decision before either write commits?
* Which cached client, session, or URL state can become stale?
* Which server or database control makes the hypothesis impossible?

## Attack Patterns

```text
repeat:      action × N → duplicate value, quota bypass, or counter inflation?
reverse:     action → benefit → undo → redo → benefit granted twice?
reorder:     effect before prerequisite → effect still commits?
skip:        call terminal endpoint directly → prerequisite enforced server-side?
replay:      success + lost response → retry → duplicate side effect?
concurrent:  read/allow A + read/allow B → write A + write B → invariant broken?
manipulate:  replace ID, role, price, reward, status, or timestamp → trusted?
stale state: load allowed state → server changes → submit old action → accepted?
```

Test only in safe, authorized environments.

## Evidence Requirements

Name the assumption, invariant, actor, operation, reachable path, existing control, and observed or structurally proven violation. Include exact files and lines or a reproducible request/state sequence.

Use the repository confidence scale: `CONFIRMED` requires direct observation; `HIGH CONFIDENCE` requires the exact reachable mechanism and concrete structural evidence; `POSSIBLE` means incomplete mechanism or evidence; `SPECULATIVE` is an unverified risk and never a blocking bug. Without a reachable mechanism or reproduction, do not exceed `POSSIBLE`.

## False Positives

Do not report behavior that is intentionally repeatable or reversible and preserves its documented invariant. Verify effective rate limiting, idempotency keys, unique constraints, transactions, ownership middleware, and server-side validation. A UI-only observation is not proof of a server flaw. Differences between test and production reduce confidence unless controls are equivalent. Unreachable combinations are discarded hypotheses, not findings.

## Output Format

Use `templates/audit-report.md`. Include severity, confidence, affected component and flow, invariant, reproduction, expected and actual behavior, root cause, impact, recommendation, and evidence provenance. Add the persona-operation pair and attacked assumption to `evidence[]`.

Keep `SPECULATIVE` items in a separate risks-to-verify section. End with a coverage ledger of tested, confirmed, protected, discarded, and untested hypotheses. Consolidate findings that share a root cause.
