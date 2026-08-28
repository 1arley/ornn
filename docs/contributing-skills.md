# Contributing Skills

## When to create a skill

Before creating a new skill, demonstrate at least one of these:

1. An eval case that fails without it.
2. An existing skill that is taking on incompatible responsibilities.
3. Measurable improvement in recall or precision for a real class of problem.
4. A recurring domain that cannot be represented by composition.

If two skills would produce the same findings in most cases, solve the gap by
adjusting boundaries, metadata, composition, or dedup instead.

## Required contract

Every skill must satisfy:

- **Problem**: what real gap does it solve?
- **Evidence of need**: which eval fails without it?
- **Scope**: when to activate, when not to activate.
- **Role**: generator, investigator, verifier, reviewer, researcher, or router.
- **Incremental value**: what it finds or confirms that existing skills cannot.
- **Overlap**: which skills it overlaps with and why it must exist separately.
- **Cost**: estimated reasoning and research cost.
- **Evals**: positive, negative, composition, and false-positive cases.

## Schema

### Frontmatter

```yaml
---
name: my-skill-name
description: One sentence describing what the skill does.
license: MIT
metadata:
  aes-category: <category>
  aes-priority: <priority>
---
```

Routing metadata (triggers, role, risk_floor, composes_with, overlaps_with) goes in
`catalog/skills.yaml`, not in the frontmatter.

### Catalog entry

Add to `catalog/skills.yaml`:

```yaml
- name: my-skill-name
  category: <category>
  role: <role>
  priority: <priority>
  risk_floor: <trivial|medium|high|critical>
  triggers:
    - "trigger phrase"
  requires_signals:
    - signal
  composes_with:
    - other-skill
  overlaps_with:
    - another-skill
  reasoning_cost: low|medium
  research_cost: low|medium|high
  lifecycle: experimental|stable|deprecated
```

### Body

The body must contain the nine sections in order:

```text
## Objective
## When to Use
## Mental Model
## Investigation Procedure
## Questions to Ask
## Attack Patterns
## Evidence Requirements
## False Positives
## Output Format
```

## Evaluation

After creating the skill:

1. Add at least one positive routing case and one negative case to `evals/cases/`.
2. Run `python3 scripts/validate.py`.
3. Run `python3 scripts/eval.py route --router v2 --check`.
4. Run `python3 -m unittest discover -s test -p 'test_*.py'`.
5. If the skill impacts findings dedup or confidence, add a fixture to
   `evals/fixtures/` and update `evals/expected/`.
6. If the skill adds a new concept, add a knowledge document.

## Stable criteria

A skill is `stable` when:

- it has evals (positive, negative, composition, false-positive);
- its responsibility boundary is documented;
- it has no known critical regression;
- validator passes;
- its output contract is defined;
- its false-positive guidance is documented.

## Pull request checklist

- [ ] `python3 scripts/validate.py` passes
- [ ] `python3 scripts/eval.py route --router v2 --check` passes
- [ ] `node --test test/cli.test.js` passes
- [ ] `python3 -m unittest discover -s test -p 'test_*.py'` passes
- [ ] `npm pack --dry-run` is clean
- [ ] catalog/skills.yaml updated
- [ ] new eval cases added
- [ ] new knowledge document added (if new concept)
- [ ] frontmatter is portable (no proprietary top-level fields)
- [ ] no unexplained regression in routing or findings metrics