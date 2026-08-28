# Architecture

This document describes the system as a whole: how a request becomes a routed set of
skills, how findings are consolidated, and how the layers stay honest. You should not
need to read every skill to understand the system.

## Pipeline

```text
REQUEST
   ↓
ROUTING          scripts/router.py over catalog/skills.yaml
   ↓
RESEARCH DECISION  research-router / research skills when uncertainty is high
   ↓
SKILL EXECUTION   selected skills produce raw findings
   ↓
EVIDENCE         mechanism + evidence records (type, description, source, result)
   ↓
DEDUP            scripts/findings.py groups by semantic identity
   ↓
CONFIDENCE       recomputed from consolidated evidence, never max-vote
   ↓
REPORT           templates/audit-report.md, templates/bug-report.md
```

## Layers

```text
skills/      = how to think      (mental model, attack patterns, evidence)
knowledge/   = what to consider  (reusable concepts, progressive disclosure)
references/  = where to research (catalog with authority and lifecycle)
catalog/     = how to route      (single source of truth for relationships)
evals/       = how to prove      (cases, fixtures, baselines, results)
scripts/     = how to run        (validator, router, eval, findings, health)
```

## Trust boundaries

1. **The catalog is the routing truth.** Triggers, roles, costs, composition and
   overlap live only in `catalog/skills.yaml`. The router derives its decision from
   it; the validator rejects drift between catalog, filesystem and frontmatter.
2. **The skill source is portable.** `SKILL.md` uses the Agent Skills shape
   (`name`, `description`, `license`, `metadata: aes-*`). Routing lists are not
   duplicated in the frontmatter.
3. **Confidence is recomputed, not claimed.** `scripts/findings.py` never inherits
   the highest confidence a skill declared. It derives confidence from mechanism +
   evidence records. A `CONFIRMED` label without direct evidence cannot survive
   consolidation.
4. **The installer is defensive.** `--force` resolves paths, refuses root/home/
   target/outside-target destinations, and never deletes outside the skill
   directory being replaced.

## Files

| Path | Purpose |
|---|---|
| `scripts/router.py` | deterministic catalog-driven router (v2) |
| `scripts/router_v1.py` | frozen manual-table baseline for comparison |
| `scripts/eval.py` | deterministic eval harness and gates |
| `scripts/findings.py` | dedup, provenance, confidence recalibration |
| `scripts/validate.py` | repo contracts: skills, catalog, references, evals |
| `scripts/check_references.py` | offline lifecycle + optional online health |
| `scripts/yaml_mini.py` | zero-dependency YAML subset parser |
| `bin/cli.js` | install/validate/doctor/list/graph/eval |
| `.github/workflows/ci.yml` | PR gates (validator, evals, CLI tests, pack) |

## Verification loop

Every behavior change must be validated end-to-end:

```bash
python3 scripts/validate.py
python3 -m unittest discover -s test -p 'test_*.py'
node --test test/cli.test.js
python3 scripts/eval.py route --router v2 --check
python3 scripts/eval.py findings-fixtures
npm pack --dry-run
```

CI runs the same suite on every PR. Routing gates (precision ≥ 90%, recall ≥ 90%,
critical recall 100%, trivial ≤ 1) block merge.
