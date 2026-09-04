---
name: reference-research
description: Selects relevant sources from the references catalog by knowledge type, authority, use and avoidance conditions, then synthesizes verified patterns instead of returning links.
license: MIT
metadata:
    aes-category: research
    aes-priority: medium
---

# Reference Research

## Objective

Use Ornn's centralized reference catalog to select, verify, and synthesize the smallest sufficient set of external sources for a task.

## When to Use

Use this skill when the task needs external methodology, heuristics, inspiration, implementation references, or discovery and the catalog can guide source selection. It is especially useful across domains or when source type and authority need explicit control.

Do not invoke it automatically for every non-trivial task or for facts already established by local code and documentation. It selects and interprets cataloged sources; `implementation-research` owns a concrete technical decision, `github-reference-research` owns repository-level mechanism comparison, and `market-research` owns observable product behavior. Compose only when those additional lenses answer a distinct unresolved question.

## Mental Model

The catalog is an index, not evidence by itself:

```text
task question -> knowledge needed -> catalog candidates
    -> use_when/avoid_when + type + authority
    -> inspect primary content -> extract claim/pattern
    -> corroborate as risk requires -> adapt or reject
```

Treat `type` as a usage constraint: methodology structures work, heuristics guide judgment, inspiration broadens options, implementation reveals mechanisms, and discovery finds candidates. Treat `authority` as a prior, not a guarantee. Authority depends on the claim: official documentation may define an API, while direct product observation best supports current behavior. URLs belong in `references/`, not in this skill.

## Investigation Procedure

1. State the decision or knowledge gap and the consequence of being wrong.
2. Decide the minimum research depth: none for a reversible known task, one authoritative source for a narrow stable fact, or corroborated research for uncertain/high-impact decisions.
3. Inspect only relevant `references/*.yaml` files and filter candidates by `use_when`, `avoid_when`, `type`, category, and authority.
4. Select sources that answer different necessary claims; do not collect redundant sources for appearance of rigor.
5. Open the relevant primary content. Record version/date, scope, and what was actually inspected.
6. Extract claims, mechanisms, constraints, and trade-offs. Distinguish observation, source assertion, and your inference.
7. Seek independent corroboration or contradictory evidence when impact, uncertainty, novelty, or irreversibility warrants it.
8. Compare findings with current project constraints and state what transfers, what needs adaptation, and what does not apply.
9. Stop when additional research is unlikely to change the decision; identify residual uncertainty.

## Questions to Ask

* What exact decision will this research inform?
* What evidence class can answer it: specification, methodology, implementation, observation, evaluation, or inspiration?
* Which catalog entries match both `use_when` and current context, and which `avoid_when` exclusions apply?
* Is the source primary for the claim, current for the relevant version, and independent of other sources?
* What content was inspected rather than inferred from the catalog description?
* Do sources disagree, and can context or version explain the conflict?
* What project constraint changes the applicability of the pattern?
* Would another source plausibly change the recommendation enough to justify its cost?

## Attack Patterns

```text
catalog authority laundering
    catalog labels source established -> source does not support the claim
    -> reject the claim or find direct evidence

type confusion
    inspiration screenshot -> technical or usability conclusion
    -> downgrade; obtain behavioral or methodological evidence

confirmation-only search
    select sources supporting the initial preference
    -> search for alternatives, limitations, and counterexamples

version drift
    source applies to version N; project uses N+3
    -> verify current behavior and record the mismatch

link accumulation
    many URLs, no extracted claims or decision change
    -> consolidate by pattern and stop redundant collection

catalog gap
    no entry answers the question
    -> use a discovery source or hand off to the appropriate research specialist
```

## Evidence Requirements

For every material claim, name the source, catalog type/authority, direct location, relevant version/date, and inspected content. State whether the claim is quoted/paraphrased observation or inference, and connect it to a project constraint. Use `CONFIRMED` only when the claim was directly verified in suitable primary evidence; `HIGH CONFIDENCE` for strong corroborated evidence with limited uncertainty; `POSSIBLE` when applicability or verification is incomplete; `SPECULATIVE` for unverified hypotheses that cannot block work. Source count alone never raises confidence.

## False Positives

Catalog inclusion does not make a source relevant or correct. High authority in one domain does not transfer to unrelated claims. Vendor material may be definitive about its API but biased in product comparisons. Community implementation may be useful despite low formal authority when code directly proves a mechanism. Convergent sources may share one upstream claim and are not independent corroboration. Inspiration is valid for option generation but not proof. Do not research beyond what the decision's risk justifies, and do not treat inability to access a source as negative evidence.

## Output Format

Never return a link dump. Organize synthesis by decision-relevant pattern, consolidating sources that support the same claim:

```markdown
### Pattern or finding
**Evidence:** <source, type/authority, version/date, direct support>
**Relevance:** <why it matters to the current decision>
**Adaptation:** <what must change for this project>
**Trade-offs / contrary evidence:** <limits and alternatives>
**Confidence:** <level and unresolved uncertainty>
**Recommendation:** <adopt, test, defer, or reject; with next action>
```

End with sources considered but excluded and the reason, plus the research stopping condition. Put any newly proposed permanent URL in the appropriate reference catalog through its separate authoring workflow, not inline in the skill.
