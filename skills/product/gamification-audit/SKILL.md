---
name: gamification-audit
description: Audits reward economies and incentive loops for replay, reversal, self-dealing, collusion, Sybil, concurrency, and automation abuse while distinguishing product risk from proven defects.
license: MIT
metadata:
    aes-category: product
    aes-priority: high
---

# Gamification Audit

## Objective

Determine whether participants can obtain or preserve rewards without the intended qualifying behavior, distort rankings or economies, or impose disproportionate cost by manipulating a reward loop.

## When to Use

Use this skill for XP, points, credits, virtual currency, reputation, ranks, achievements, streaks, likes, reactions, referrals, quests, leaderboards, and unlocks. Prioritize transferable, redeemable, scarce, status-bearing, or costly rewards. Trigger it for farming, referral fraud, self-reward, collusion, Sybil accounts, replay, leaderboard manipulation, or reward inflation.

Do not treat all repeat engagement or automation as abuse without a stated product rule and material consequence. Compose with `business-logic-audit` for reward invariants, `idempotency-audit` for duplicate delivery, `race-condition-hunter` for concurrent claims, `api-abuse-audit` for direct/repeated API use, `input-trust-audit` for client-controlled reward values, and `authorization-audit` for acting on behalf of another account. Keep the economic/incentive finding here and cross-reference lower-level mechanisms.

## Mental Model

Model each reward as a ledger-backed economic loop:

```text
TRIGGER -> ELIGIBILITY -> CLAIM/ISSUANCE -> REWARD STATE -> REVERSAL/EXPIRY
                 \-> actor, subject, window, cap, uniqueness, cost
```

Then test who can manufacture the trigger, satisfy eligibility, repeat or race issuance, transfer value, and retain value after reversal. The relevant invariant is usually net value per actor/subject/window, not whether a reward event appears twice. A legitimate action-reversal-action cycle may issue twice while remaining net-neutral; farming requires excess retained value, unfair influence, or unintended cost.

Assess incentive and impact before controls. Sybil resistance, identity proofing, CAPTCHAs, device signals, and rate limits have cost, accessibility, privacy, and false-positive trade-offs. Recommend controls proportionate to reward value and adversary economics rather than assuming maximal friction.

## Investigation Procedure

1. Inventory rewards and document value: redeemability, transferability, ranking effect, unlocks, external cost, expiry, and reversibility.
2. Map trigger, eligibility, actor, beneficiary, subject, issuance path, ledger entry, cap/window, reversal, and expiry for each reward.
3. State invariants such as one grant per `(actor, subject, action, window)`, no self-benefit, or total redeemable supply matching ledger entries.
4. Trace server-side enforcement across every API, job, webhook, and admin path. Identify client-controlled fields and direct endpoint access.
5. Test repeat, replay, reverse/reapply, reorder, skipped steps, and concurrent claims. Measure net reward and side effects after every step.
6. Test relationships: self-action, reciprocal pairs, rings, shared beneficiary/payment instrument, and multiple accounts. Do not infer common identity from IP alone.
7. Test automation at realistic rates and assess marginal attacker cost versus reward value; inspect caps, velocity rules, review, and recovery.
8. Verify reversals, disputes, deletions, bans, expiry, and downstream leaderboard/unlock reconciliation.
9. Check ledger auditability: immutable reason/source identifiers, uniqueness, balance derivation, and correction history.
10. Separate confirmed implementation defects from product-policy risks and quantify feasible scale before severity.

## Questions to Ask

* What behavior is the reward intended to cause, and what evidence proves qualification?
* Who triggers, earns, funds, and benefits from it? May any of those be the same actor?
* What is the uniqueness scope and time window? Is it enforced atomically server-side?
* After action, reversal, and repetition, what is the net balance, rank, unlock, and external cost?
* Can reciprocal or ring behavior produce value without genuine participation?
* What does one additional account cost, and which signals legitimately link accounts?
* Can requests be replayed, reordered, skipped, or sent directly outside the UI?
* Do concurrent claims exceed caps or create duplicate ledger entries?
* Are reward amount, beneficiary, reason, or timestamps accepted from the client?
* Can moderation and correction reverse every derived effect, not only the visible balance?
* Is automation forbidden, merely undesired, or an intended integration?

## Attack Patterns

```text
reversal retention
    act -> +10; reverse -> 0 removed; act -> +10
    net +20 from one live action -> excess retained value

net-neutral cycle
    act -> +10; reverse -> -10; act -> +10
    net +10 for one live action -> normally correct, inspect side effects only

self-dealing
    actor rewards their own subject or controls both sides of a referral

collusion ring
    A rewards B, B rewards C, C rewards A
    measure whether reciprocal activity bypasses individual self-action checks

replay and concurrency
    submit the same claim/event sequentially and behind a barrier
    inspect ledger uniqueness, caps, and downstream effects

Sybil scaling
    create several permitted test accounts sharing selected signals
    quantify cost, reward, detection, and false-positive risk

reorder or skip
    call claim before qualification, after expiry, or after reversal
    bypass a UI-only prerequisite

derived-state residue
    reverse or ban the source account
    balance changes, but rank/unlock/referrer payout remains
```

Use test accounts and non-redeemable environments. Do not create uncontrolled accounts, evade identity controls, or impose costs on real users/services.

## Evidence Requirements

Map the complete loop and state the invariant, actor/beneficiary/subject, value, window, and abuse vector. Record exact operations and before/after ledger balance, derived state, and external effects. Cite the server checks, uniqueness/cap enforcement, and reversal path. For Sybil or automation claims, quantify feasible scale and attacker cost; a theoretical ability to create another account is insufficient.

`CONFIRMED` requires observed excess retained value, unfair state, or unintended cost through a valid test sequence. `HIGH CONFIDENCE` requires an exact reachable mechanism and complete economic loop. `POSSIBLE` means policy, scale, identity linkage, or impact is incomplete. `SPECULATIVE` is never blocking. Severity follows reward value, repeatability, scale, detectability, recoverability, and harmed parties, not the word "gamification."

## False Positives

Do not call a fully reversed, net-neutral action cycle farming. Repeatable rewards may be intentional when each action has independent value or a documented reset window. Cosmetic points with no meaningful influence warrant lower severity. Shared IP, device, household, or payment signals do not alone prove one operator. Automation may be supported behavior, and rate limits or CAPTCHAs do not prove a reward invariant. A detected anomaly without a path to excess value is not a confirmed defect. If a product deliberately accepts referral leakage or approximate counters within a budget, report exceeded bounds rather than the mere possibility.

## Output Format

Use `templates/audit-report.md` for each distinct exploitable loop. Include intended behavior, invariant, reward value, actor/beneficiary/subject, full operation sequence, net ledger and derived-state change, feasible scale, root cause, impact, evidence level, provenance, and proportionate mitigation with abuse, accessibility, privacy, and product trade-offs.

```text
reward | trigger | eligibility | uniqueness/window | reversal | net abuse | scale | status
```

Prioritize redeemable or transferable value, irreversible partner cost, entitlement unlocks, and ranking integrity. Distinguish policy decisions from implementation defects and cross-reference lower-level security or reliability findings.
