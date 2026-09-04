# Skill Authoring

Skills are canonical, portable knowledge. A skill must remain useful when copied to a
compatible agent without Ornn tooling, project state, a router, or an executor. Keep
execution ownership with the consuming agent. Put ordered cross-skill workflows in
`recipes/`, reusable bundles in `collections/`, URLs in `references/`, and global
routing relationships in `catalog/skills.yaml`.

Use the standard structure below so compatible agents can discover a skill and
`scripts/validate.py` can verify the repository contract.

## Location

```text
skills/<category>/<skill-name>/SKILL.md
```

Valid categories are `audit`, `security`, `reliability`, `product`, `frontend`,
`research`, and `meta`. The directory and frontmatter `name` must use the same
kebab-case identifier. Agent Skills names may contain lowercase letters, digits, and
single hyphens between segments, and may not exceed 64 characters.

## Portable Frontmatter

Use YAML between `---` delimiters:

```yaml
---
name: my-skill-name
description: One sentence describing what the skill does.
license: MIT
metadata:
  aes-category: audit
  aes-priority: high
---
```

| Field | Type | Contract |
|---|---|---|
| `name` | string | Kebab-case identifier matching the skill directory; maximum 64 characters. |
| `description` | string | Concise discovery description; maximum 1,024 characters. |
| `license` | string | License identifier for the portable skill. |
| `metadata.aes-category` | string | One of the valid Ornn categories. |
| `metadata.aes-priority` | string | `low`, `medium`, or `high`; must match the catalog entry. |

Do not put `category`, `triggers`, or `priority` at the top level. Those legacy fields
are not portable. Do not add `metadata.aes-triggers`: trigger lists belong only in the
catalog.

## Catalog Ownership

`catalog/skills.yaml` is the single source of truth for routing and cross-skill
relationships. Every canonical skill needs a matching catalog entry with its
category, role, priority, risk floor, triggers, required signals, composition and
overlap relationships, reasoning and research costs, and lifecycle.

Keep the skill body self-contained by explaining its activation boundary, exclusions,
and how its responsibility differs from adjacent skills. Do not copy the catalog's
global relationship lists into the body. If composition requires an ordered workflow,
encode that workflow in a recipe instead. Catalog priority and
`metadata.aes-priority` must agree; catalog category and `metadata.aes-category` must
also agree.

## Body: Nine Required Sections

The body must contain these nine sections in this order. Do not omit a section. Use
“Not applicable” with a concrete justification only when the section genuinely does
not apply. Additional `##` sections are supported after the required structure, but
prefer the fixed sections unless an extension adds distinct value.

```markdown
# Skill Name

## Objective
State the problem this skill teaches the agent to solve and its distinctive value.

## When to Use
Define positive activation conditions, negative boundaries, and relevant context.
Describe composition by responsibility when useful, without duplicating catalog data.

## Mental Model
Explain the reasoning lens, invariants, or conceptual model that guides the work.

## Investigation Procedure
Give an ordered, executable investigation. Separate hypothesis generation from
verification, and identify when repository or external evidence is needed.

## Questions to Ask
List concrete questions that expose the target failure or decision class.

## Attack Patterns
Provide reusable probes or transformations such as repeat, reverse, reorder, skip,
replay, concurrent, and manipulate. For non-adversarial skills, use equivalent
stress tests of the skill's assumptions.

## Evidence Requirements
Define what supports each conclusion, how to reproduce or trace it, and what evidence
raises confidence from POSSIBLE to HIGH CONFIDENCE or CONFIRMED.

## False Positives
Explain acceptable or intentional behavior, compensating controls, and conditions
that should prevent a candidate from becoming a finding.

## Output Format
Specify the required deliverable and fields. Audit skills should use
`templates/audit-report.md` and preserve evidence provenance.
```

## Quality Contract

Before considering a skill ready, confirm that it answers all of the following:

| Concern | Where it belongs |
|---|---|
| **Need** — What recurring gap does it solve? | `Objective` |
| **Scope** — When should and should not it activate? | `When to Use` |
| **Role** — Does it generate, investigate, verify, review, research, or route? | Body boundary plus catalog `role` |
| **Incremental value** — What does it add beyond adjacent skills? | `Objective`, `When to Use`, `Mental Model` |
| **Heuristics** — What reasoning and probes does it teach? | `Mental Model`, `Questions to Ask`, `Attack Patterns` |
| **Evidence** — How are conclusions confirmed? | `Evidence Requirements` |
| **False positives** — What must not be reported? | `False Positives` |
| **Output** — What artifact does it produce? | `Output Format` |
| **Composition and overlap** — Why is it separate, and how does it cooperate? | Responsibility boundary in the body; relationships in the catalog |
| **Cost and lifecycle** — How expensive and mature is it? | Catalog metadata |
| **Evaluation** — What proves routing and behavior? | `evals/` cases and fixtures |

If two skills would produce the same findings in most cases, first tighten their
boundaries, catalog metadata, composition, or deduplication rules. Create another
skill only when it adds a distinct, testable capability.

## Writing Conventions

- Write all canonical `SKILL.md` content in English, including frontmatter,
  instructions, explanations, questions, examples, and output guidance.
- Use the exact English names of the nine required headings.
- Prefer direct, agent-agnostic instructions. Do not require an Ornn runtime or a
  specific provider unless the skill is explicitly an integration.
- Use fenced `text` blocks for flows and diagrams that should remain readable in a
  terminal.
- Avoid implicit knowledge. Explain necessary concepts or point to repository
  knowledge artifacts. Keep URLs in reference catalogs rather than skill bodies.
- Separate candidates from findings and use `CONFIRMED`, `HIGH CONFIDENCE`,
  `POSSIBLE`, and `SPECULATIVE` according to `AGENTS.md`.
- Consult the skill's own false-positive guidance before reporting a conclusion.

## Validation and Evaluation

Run the repository checks after creating or changing a skill:

```bash
python3 scripts/validate.py
python3 scripts/eval.py route --router v2 --check
node --test test/cli.test.js
python3 -m unittest discover -s test -p 'test_*.py'
```

The validator checks, among other repository contracts:

- portable frontmatter and required fields;
- valid name, category, and priority values;
- directory/name agreement;
- absence of legacy top-level routing fields and duplicated trigger metadata;
- presence and order of the nine required sections;
- agreement between catalog and skill category/priority;
- catalog, collection, recipe, integration, reference, and eval cross-references.

Add positive and negative routing cases for a new skill. Add composition and
false-positive cases where relevant. If a change affects findings deduplication or
confidence, update the corresponding fixtures and expected output. Add a knowledge
document only when the skill introduces a reusable concept that is not already
documented.

See `skills/audit/adversarial-review/SKILL.md` for a canonical example and
`docs/contributing-skills.md` for contribution gates and the complete pull-request
checklist.
