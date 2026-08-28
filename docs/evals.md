# Evals

## Purpose

Evals measure behavior, not just file shape. They answer: does the router select the
right skills? Does consolidation produce one finding per real bug with calibrated
confidence?

## Case format

Cases live in `evals/cases/<domain>/*.yaml`. They are parsed by `scripts/yaml_mini.py`.

```yaml
id: duplicate-reward-001
title: reward can be farmed by reverse/repeat
task: Audit a reaction system where each new reaction grants XP.
context:
  - reaction can be removed
  - XP is granted on create
risk: high
category: product
expected_skills:
  required:
    - gamification-audit
  useful:
    - idempotency-audit
  forbidden:
    - animation-review
expected_findings:
  - reward can be repeatedly earned after reversal
forbidden_claims:
  - race condition is confirmed without concurrency evidence
negative: false
```

### required vs useful

`required` = the task cannot be adequately falsified without it. `useful` = relevant
but optional under smallest-sufficient-set. Marking every adjacent skill required
encodes skill explosion into the ground truth.

### Negative cases

`negative: true` means the correct answer is no bug. Negative cases must not declare
`expected_findings`.

## Coverage minimums

The validator enforces:

| Domain | Minimum cases |
|---|---:|
| Audit | 5 |
| Security | 5 |
| Reliability | 5 |
| Product | 4 |
| Frontend | 5 |
| Research | 3 |
| Mixed | 3 |

Every behavioral domain must include at least one negative case.

## Routing metrics

```text
routing_precision      selected skills that are required or useful / all selected
routing_recall          required skills selected / required total
critical_skill_recall   required skills on high/critical cases that were selected
over_routing_rate       cases with unnecessary/forbidden/over-budget selection
average_skills_selected mean selected per case
unnecessary_skill_count selected but neither required nor useful
missing_required_skill_count required but not selected
risk_classification_accuracy (diagnostic)
```

### Gates

```text
routing_precision       >= 90%
routing_recall          >= 90%
critical_skill_recall   == 100%
trivial selected        <= 1
```

These gates block CI. They are the first line of defense against silent regression.

## Findings metrics

Run after consolidation (`scripts/findings.py`) on a model-produced run:

```text
finding_precision
finding_recall
critical_finding_recall
duplicate_finding_rate        (duplicates remaining after consolidation; target 0)
duplicates_removed
unsupported_confirmation_rate (CONFIRMED that should not be)
confidence_calibration        (final == recomputed confidence)
expected_confidence_accuracy
```

The deterministic fixtures (`findings-dedup`, `findings-confidence`) assert:
- two skills describing the same bug merge into one finding;
- three `CONFIRMED` claims without reproduction do not become `CONFIRMED`;
- `CONFIRMED` requires exact mechanism + direct evidence with observed result;
- provenance (`generated_by`, `investigated_by`, `verified_by`) is preserved.

## Baselines and comparison

The deterministic routing baseline is frozen at `evals/baselines/router-v1.json`; the
current v2 result is `evals/results/router-v2.json`. Recreate them only from the same
case revision:

```bash
python3 scripts/eval.py route --router v1 --out evals/baselines/router-v1.json
python3 scripts/eval.py route --router v2 --out evals/results/router-v2.json
```

End-to-end finding metrics require an external model run and are documented as
external-gated. Never publish benchmark numbers without provider/model/version,
prompts, run count, date, and cost.

## How to add a case

1. Pick a real scenario (not a re-phrasing of an existing skill's example).
2. Write the YAML case; include at least one negative variant where reasonable.
3. Run `python3 scripts/validate.py` (checks ids, enums, references, coverage).
4. Run `python3 scripts/eval.py route --router v2 --check`.
5. Regenerate `evals/results/router-v2.json` if the case changes routing metrics.

## How to interpret a regression

A gate failure means the change made routing or consolidation measurably worse.
Investigate before adjusting the gate: either the behavior is wrong, or the case is
mislabeled. Prefer fixing behavior over lowering thresholds. If a threshold must
change, justify it in the PR with the data that motivated it.
