# Evaluation suite

The eval suite measures behavior, not only file shape.

## What runs without external services

Routing evals are fully deterministic and run locally:

```bash
# Current catalog-driven router (v2); fail when gates regress
python3 scripts/eval.py route --router v2 --check

# Frozen pre-catalog router baseline
python3 scripts/eval.py route --router v1

# Recreate versioned JSON
python3 scripts/eval.py route --router v1 --out evals/baselines/router-v1.json
python3 scripts/eval.py route --router v2 --out evals/results/router-v2.json
```

The runner reads every case whose `category` is `routing`, routes the complete
`task + context`, and measures:

- `routing_precision`: selected skills that are required **or useful** / all selected;
- `routing_recall`: required skills selected / required skills total;
- `critical_skill_recall`: required skills selected on high/critical cases;
- `critical_recall_case_rate`: high/critical cases with full required coverage;
- `over_routing_rate`: cases with unnecessary, forbidden, or over-budget selection;
- `average_skills_selected`;
- `unnecessary_skill_count`;
- `missing_required_skill_count`;
- `risk_classification_accuracy` (diagnostic; routing is evaluated using case risk).

Initial gates from `plan.md`:

| Metric | Gate |
|---|---:|
| Routing precision | >= 90% |
| Routing recall | >= 90% |
| Critical skill recall | 100% |
| Skills on a trivial task | <= 1 |

## Current reproducible comparison

The committed JSON is the source of truth. Do not copy numbers into docs without
regenerating both files from the same case revision.

| Router | Precision | Recall | Critical recall | Avg selected |
|---|---:|---:|---:|---:|
| v1 manual tables | 47.7% | 32.1% | 46.7% | 2.32 |
| v2 catalog/scoring | 91.5% | 100.0% | 100.0% | 2.47 |

Dataset: 19 routing cases. These numbers measure the deterministic routing layer,
not external-agent finding quality.

## Case format

Cases are YAML files under `evals/cases/<domain>/`. The supported subset is parsed
by `scripts/yaml_mini.py`; use block lists, not advanced YAML features.

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

### `required` vs `useful`

`required` means the task cannot be adequately falsified without that skill. `useful`
means the skill is relevant but optional under the smallest-sufficient-set rule. Do not
mark every adjacent skill required: that encodes skill explosion into the ground truth.

### Negative cases

Set `negative: true` and leave `expected_findings` empty when the correct answer is no
bug. A cosmetic trivial case may also have no required skill.

## Findings evals and external-model gate

The repository includes deterministic finding consolidation and metric computation, but
cannot honestly claim end-to-end model results without running an external model.
Infrastructure is still reproducible:

1. run an agent against a fixture with one of the modes below;
2. save raw JSON using `evals/findings-output.schema.json`;
3. consolidate it with `scripts/findings.py`;
4. measure it:

```bash
python3 scripts/eval.py findings --input evals/results/my-run.json
```

Required comparison modes:

```text
A  baseline agent without skills
B  agent with one relevant skill
C  router v2 + composed skills
D  router v2 + composed skills + research-router (when applicable)
```

Record provider/model/version, prompts, run count, date, and cost. Never fill benchmark
metrics with estimates or results from a different case revision.

Findings metrics:

- finding precision and recall;
- critical finding recall;
- duplicate finding rate;
- unsupported confirmation rate;
- confidence calibration.

The deterministic tests cover confidence and dedup contracts even when model execution
is unavailable. End-to-end benchmark numbers remain explicitly external-gated.

## Adding or changing behavior

Every behavioral skill/router change must:

1. add or update at least one case;
2. regenerate the v2 result;
3. run `python3 scripts/eval.py route --router v2 --check`;
4. run `python3 scripts/validate.py`;
5. explain any metric decrease; regressions fail CI.

A new skill also needs positive, negative, composition and false-positive cases before
it can be considered stable.
