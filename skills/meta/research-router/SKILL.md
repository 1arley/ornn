---
name: research-router
description: Teaches agents how to choose research sources and depth by problem type, authority, evidence class, uncertainty and impact.
license: MIT
metadata:
    aes-category: meta
    aes-priority: high
---

# Research Router

## Objective

Choose proportionate research depth, evidence classes, and source types for a decision, then route collection to the appropriate research capability without conducting the research itself.

## When to Use

Use when external knowledge is needed and the choice of sources or research depth is non-obvious, when a task spans evidence classes, or when the user asks where or how deeply to research. Do not activate merely because a task contains the word “research,” when repository evidence is sufficient, or as a mandatory stage before implementation.

This skill selects a research strategy. `reference-research`, `github-reference-research`, `market-research`, `implementation-research`, and `design-library-research` collect and synthesize evidence. `skill-router` decides which skills are relevant overall.

## Mental Model

Start from the decision and its uncertainty:

```text
decision → unknowns → consequence if wrong → required evidence class
→ authoritative source types → stopping condition → research skill
```

Source type and authority answer different questions. Methodology frames reasoning; heuristics calibrate judgment; inspiration expands possibilities; implementation demonstrates a concrete approach; discovery sources locate better evidence. None should be promoted beyond what it can support.

Research depth should grow with uncertainty, impact, irreversibility, disagreement, and source volatility. “Full” research is not synonymous with reading every catalog entry.

## Investigation Procedure

1. Define the decision research must support, what is already known, and what remains uncertain.
2. Decide whether external research can materially change the answer. If repository or supplied evidence is sufficient, recommend none.
3. Assess impact, reversibility, volatility, novelty, and evidentiary disagreement. Choose no research, a proportional check, or a full multi-source investigation.
4. Decompose unknowns into evidence needs: authoritative rules, implementation feasibility, real-world behavior, market practice, user behavior, or aesthetic exploration.
5. Read only relevant entries from `references/*.yaml` or packaged `reference/catalogs/*.yaml`. Match `use_when`, `avoid_when`, type, category, authority, status, and verification date.
6. Select primary sources for factual and high-impact claims. Add independent sources when they reduce a specific uncertainty, not to inflate source count.
7. Assign the collection mode: catalog synthesis to `reference-research`, repository evidence to `github-reference-research`, product comparison to `market-research`, technical solution research to `implementation-research`, or pre-implementation frontend composition to `design-library-research`.
8. Define search questions, source order, exclusions, stopping condition, and what evidence would change the decision.
9. Record discarded source classes and residual uncertainty. The consuming agent then performs the selected research.

## Questions to Ask

- What decision will this research change?
- Which unknowns are factual, normative, implementation-specific, behavioral, or aesthetic?
- What is the cost of being wrong, and can the decision be reversed?
- How volatile or contested is the information?
- Which evidence class can actually support each claim?
- Which catalog entries match both `use_when` and the required authority?
- Is a primary source available, and where is independent corroboration valuable?
- Which research skill matches the object of study?
- What stopping condition prevents both premature closure and source accumulation?
- What residual uncertainty should remain explicit?

## Attack Patterns

- **Remove:** eliminate each source and identify which uncertainty becomes unsupported.
- **Promote:** attempt to use inspiration or discovery as proof; reject the unsupported promotion.
- **Contradict:** seek an authoritative source that could falsify the preferred answer.
- **Stale:** verify date, version, status, and current applicability for volatile claims.
- **Reverse:** start from the intended recommendation and detect cherry-picked sources.
- **Escalate:** raise impact or irreversibility and confirm that depth and authority increase.
- **De-escalate:** make the task trivial and reversible; confirm research shrinks or disappears.
- **Stop:** test whether additional sources still change confidence or decision criteria.

## Evidence Requirements

A routing decision must name the decision, unknowns, research level, selected source types and catalog entries, their type/authority/status, the claims they can support, source order, assigned research skill, exclusions, stopping condition, and residual uncertainty. Selection is traceable to catalog metadata, not hard-coded source rankings in this skill. Research routing is not a finding and does not itself validate any factual claim.

## False Positives

- External research is unnecessary when current project evidence answers the decision.
- High source count does not equal strong evidence.
- Community or curated sources can be appropriate for discovery or implementation examples, but not substitutes for available authoritative rules.
- Official documentation may define an API yet not demonstrate production trade-offs.
- GitHub popularity does not prove quality, security, suitability, or maintenance.
- Real-product prevalence does not establish that a pattern fits this product.
- Inspiration can guide exploration but cannot establish technical or accessibility claims.
- `composes_with` does not require every research skill to run.
- Do not dispatch to catalog entries that are inactive, mismatched by `avoid_when`, or unavailable without stating the limitation.

## Output Format

```markdown
## Research Router - Strategy

**Decision:** <decision to support>
**Unknowns:** <material uncertainties>
**Research level:** <none | proportional | full>
**Stop when:** <evidence-based stopping condition>

### Evidence plan
1. <source/catalog entry> - <type>; <authority>; supports <claim>
2. ...

### Research skill
<reference-research | github-reference-research | market-research |
implementation-research | design-library-research | none>

### Exclusions
- <source or class> - <why it cannot help>

### Residual uncertainty
- <what the planned evidence may not settle>
```

The consuming agent performs and synthesizes the research. If the level is `none`, explain which available evidence already settles the decision.
