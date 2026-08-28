# Routing

## Principle

The router selects **the smallest sufficient set of skills** to falsify the relevant
assumptions. It does not maximize coverage. The current implementation is
`scripts/router.py`; the frozen baseline is `scripts/router_v1.py`.

## Single source of truth

`catalog/skills.yaml` holds all relationship data. Fields:

```text
name               — unique skill identifier
category           — audit / security / reliability / product / frontend / research / meta
role               — generator / investigator / verifier / reviewer / researcher / router
priority           — low / medium / high
risk_floor         — trivial / medium / high / critical (minimum risk to activate)
triggers           — semantic phrases; matched by word overlap + synonym groups
requires_signals   — semantic signals that suggest the skill
composes_with      — skills that work well together (symmetric, undirected)
overlaps_with      — skills that may find the same class of bug (symmetric, undirected)
reasoning_cost     — low / medium (estimated reasoning tokens)
research_cost      — low / medium / high (estimated research tokens)
lifecycle          — experimental / stable / deprecated
```

## Scoring model

```text
score = trigger_match * 2.0
      + domain_match * 1.5
      + risk_unlock * 0.3
      + required_signal * 0.5
      + composition_bonus * 0.5
      - overlap_penalty * 0.6
      - cost_penalty * 0.2
```

Trigger match uses word-level overlap with synonym expansion. A skill only enters the
candidate pool if its trigger_score > 0 and its risk_floor is cleared. Domain/risk/
signal bonuses rank tie-broken candidates; they never select a skill without trigger
evidence.

## Skill budget

| Risk | Budget |
|---|---:|
| trivial | 0–1 |
| medium | 1–2 |
| high | 2–4 |
| critical | 3–6 |

The budget is enforced by selecting the highest-scoring candidates until the max is
reached. A justification is recorded when the budget is exceeded.

## Execution order

Skills are ordered by role: generator → investigator → verifier → reviewer →
researcher. Research moves first when uncertainty is the primary problem.

## Near misses

The router reports at most three skills that had evidence but were not selected. This
replaces the old "Not selected" list that could include every unrelated skill.

## Overlap penalty

When two skills have shared `overlaps_with` entries, the second one selected receives
a negative score adjustment. This penalizes coverage duplication without preventing
the first of a family.

## Composition backbone

After primary selection, the router scores potential composition partners by their
direct evidence, whether they add a missing role (verifier, reviewer), and their
overlap penalty. Only partners that add a new role or confirm a critical risk are
pulled in, and only up to the budget limit.

## Research routing

The router does not automatically select research skills. It indicates whether
`research-router` is needed based on uncertainty and external-knowledge signals.

## Deterministic and testable

The router is deterministic for the same input. Routing evals measure precision,
recall, critical recall, over-routing, and average selected skills against 19
labeled cases. The gates block PRs with regressions.

## Verification

After changing the router or catalog, run:

```bash
python3 scripts/eval.py route --router v2 --check
```

To measure against the frozen baseline:

```bash
python3 scripts/eval.py diff --base evals/baselines/router-v1.json
```