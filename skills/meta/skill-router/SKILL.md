---
name: skill-router
description: Teaches agents how to select a small, sufficient set of skills using relevance, risk, overlap and cost as optional decision aids.
license: MIT
metadata:
    aes-category: meta
    aes-priority: high
---

# Skill Router

## Objective

Select the smallest set of specialist lenses that can address or falsify the relevant assumptions in a task, without confusing routing with invocation, execution, or evidence.

## When to Use

Use when a user asks which skills to use, when a nontrivial task spans domains, when selection rationale matters, or when too many plausible skills would create redundant work. Trivial reversible work may need no skill. The Ornn gateway uses the same policy internally, but this skill is portable methodology and does not require the deterministic router.

This skill recommends and orders skills; it does not invoke them, execute a recipe, perform research, or produce findings. Consult `research-router` only when choosing external source types is itself unresolved.

## Mental Model

Route against assumptions and verification capabilities, not isolated keywords:

```text
task and context → risk and domain → candidate signals
→ marginal coverage minus overlap and cost → ordered sufficient set
```

The authoritative cross-skill metadata lives in `catalog/skills.yaml` or the packaged `reference/catalog/skills.yaml`. The deterministic `scripts/router.py` implements a reproducible recommendation using that catalog; its score is a ranking aid, not probability or authority.

The current heuristic budget is 0-1 skills for trivial risk, 1-2 for medium, 2-4 for high, and 3-6 for critical. Treat the range as pressure against over-routing, not a quota. Explicit user selections and demonstrated distinct coverage may justify exceeding it.

## Investigation Procedure

1. Restate the task with concrete context, scope, exclusions, and outcome.
2. Identify assumptions that may fail and classify risk as trivial, medium, high, or critical.
3. Identify the dominant domain and meaningful adjacent domains from mechanisms, not vocabulary alone.
4. Read catalog metadata only: triggers, required signals, risk floor, role, overlap, composition, priority, lifecycle, and costs.
5. Reject candidates whose required signals are absent, context is negated, risk floor is unmet, or lifecycle makes them unsuitable.
6. Rank remaining candidates by trigger and domain evidence, distinct verification role, marginal coverage, overlap, and reasoning/research cost.
7. Apply budget pressure. Remove each candidate in turn; retain it only if a relevant assumption or verification capability becomes uncovered.
8. Order the selected set so hypotheses are generated before mechanisms are investigated and verified. Put research first only when external uncertainty blocks the work.
9. Record no more than three genuine near misses and why they were excluded.
10. If deterministic tooling is available, compare the recommendation with `scripts/router.py --json`; investigate disagreement rather than blindly adopting either result.
11. When routing metadata or code changes, run routing evals and inspect precision, recall, critical recall, forbidden selections, and trivial over-routing.

## Questions to Ask

- Which concrete assumptions must be tested?
- What mechanism, asset, or user consequence raises the risk?
- Which candidate can generate a hypothesis, and which can verify its mechanism?
- Is the required signal present, absent, negated, or merely inferred?
- Does a candidate add distinct coverage or restate another skill?
- Is a composition relationship useful here, or just generally adjacent?
- Does the expected marginal value justify reasoning or research cost?
- Would excluding the candidate leave a critical assumption uncovered?
- Is external knowledge required, or can repository evidence settle the question?

## Attack Patterns

- **Remove:** drop each selected skill and name the exact lost assumption or capability; remove it permanently if none is lost.
- **Negate:** add explicit negative context and verify that matching terms do not route forbidden domains.
- **Ambiguate:** distinguish UI state from shared-state consistency, copy access from authorization, and routine lookup from deep research.
- **Swap:** replace a broad generator with a mechanism-specific investigator and compare coverage.
- **Reverse:** begin from every selected skill and demand task evidence that justifies it.
- **Budget:** force candidates to compete on marginal coverage instead of filling the maximum.
- **Replay:** route equivalent paraphrases and investigate unstable selections caused by brittle trigger wording.

## Evidence Requirements

A routing recommendation must record the task context, dominant category, risk, budget, selected skills in order, role and concrete trigger/signal for each, distinct coverage, up to three near misses, and research decision. If scores are reported, identify them as outputs of the current deterministic heuristic and preserve the tool/version or catalog revision. When routing changes are evaluated, report precision, recall, critical-skill recall, trivial selection count, and concrete regressions. Selection never changes the confidence of a downstream finding.

## False Positives

- Category adjacency without a trigger, signal, or uncovered assumption.
- A matching word used in another sense or under negation.
- Treating `composes_with` as a mandatory dependency.
- Treating `overlaps_with` as mutual exclusion rather than a prompt to compare coverage.
- Treating a `useful` eval label as required in every instance.
- Filling the budget because capacity remains.
- Rejecting an explicit user-selected skill solely because automatic risk or budget heuristics disagree.
- Listing every catalog entry as a near miss.
- Duplicating catalog relationships in this document and allowing them to drift.

## Output Format

```markdown
## Skill Router - Dispatch

**Task:** <task and relevant context>
**Dominant category:** <category>
**Risk:** <trivial | medium | high | critical>
**Budget:** <range; selected N>

### Selected
1. `<skill>` - role: `<role>`; evidence: <observed trigger/signal>; coverage: <assumption or capability>
2. ...

### Near misses
- `<skill>` - <why plausible; why excluded>
- no more than three

### Research routing
<none | proportional | full; rationale and research-router recommendation>

### Budget justification
<within budget | explicit reason for exceeding it>
```

The consuming agent decides whether and how to apply the recommendation. Do not imply that selected skills have run, that their hypotheses are findings, or that their composition is mandatory.
