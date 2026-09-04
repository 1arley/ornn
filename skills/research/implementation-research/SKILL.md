---
name: implementation-research
description: Resolves a concrete technical implementation decision with version-matched primary sources, targeted practical evidence, explicit alternatives, and an actionable context-specific recommendation.
license: MIT
metadata:
    aes-category: research
    aes-priority: medium
---

# Implementation Research

## Objective

Answer a specific technical implementation question with the minimum sufficient authoritative evidence and turn it into a verifiable recommendation for the current project.

## When to Use

Use this skill when implementation is blocked or materially affected by uncertain library behavior, API contracts, integration design, architecture, performance, security, concurrency, compatibility, or dependency choice. The question should be concrete enough to compare solutions against project constraints.

Do not use it for open-ended catalog discovery (`reference-research`), product behavior (`market-research`), or repository evaluation as the main deliverable (`github-reference-research`). Pull in repository research only when official sources do not resolve production mechanics or when comparing implementation precedents adds distinct evidence. Skip research when local code and version-matched documentation already settle a low-risk reversible choice.

## Mental Model

Source strength is claim-specific, not a fixed global ladder:

```text
technical question + project constraints + decision criteria
    -> version-matched primary specification/docs/code
    -> unresolved behavior -> maintainer history or reproducible experiment
    -> practical alternatives -> production evidence and measurements
    -> trade-off comparison -> recommendation + verification
```

Official documentation defines supported contracts; source and tests reveal mechanisms; maintainers explain intent and version changes; production examples show feasibility; reproducible benchmarks measure a particular environment; articles help discovery and synthesis. None substitutes for the evidence class the claim requires.

## Investigation Procedure

1. Convert the request into a falsifiable technical question and list current stack/version, constraints, invariants, decision criteria, and consequences of error.
2. Inspect local manifests, code, configuration, and product contracts before external research.
3. Set proportional depth: one primary source for a narrow supported API; corroboration and experiment for ambiguous/high-impact behavior; broader comparison for an irreversible dependency or architecture choice.
4. Read version-matched official documentation, specifications, release notes, and migration guidance. Record exact scope and date/version.
5. If behavior remains unclear, inspect upstream source/tests and maintainer issues or pull requests tied to the relevant version. Distinguish merged/current behavior from proposals.
6. Identify viable alternatives, including doing nothing or using an existing project primitive. Compare them using predeclared criteria.
7. Consult production examples or technical analyses only for questions they can support. Trace secondary claims to primary sources.
8. Reproduce uncertain behavior or benchmark locally when outcome depends on environment. State setup, workload, and limitations.
9. Synthesize the mechanism, applicability, risks, migration/rollback costs, and exact implementation next step.
10. Stop once evidence resolves the decision; list remaining uncertainty and a verification gate.

## Questions to Ask

* What exact behavior or choice is uncertain, and what would falsify each candidate answer?
* Which project versions and constraints control applicability?
* What is the primary authority for this claim: specification, official docs, source, or measurement?
* Is cited material current, released, and applicable rather than proposed or deprecated?
* What does local code already provide, and is a new dependency necessary?
* Which alternatives meet the invariant, and on what decision criteria?
* Are performance or scale claims reproduced under a comparable workload?
* What failure, security, maintenance, lock-in, compatibility, and migration costs arise?
* What small test can verify the recommendation before broad adoption?

## Attack Patterns

```text
documentation happy path
    official example works nominally -> inspect errors, concurrency, lifecycle, and limits

version collapse
    combine advice from incompatible releases -> pin every material claim

proposal as contract
    issue/PR suggests feature -> verify release and current documentation

benchmark theater
    adopt fastest option from unrelated workload -> reproduce representative conditions

dependency reflex
    choose a library before checking platform/local primitives -> compare with no-new-dependency option

single-solution search
    research only preferred approach -> define alternatives and disconfirming evidence

link-dump ending
    sources collected without a decision -> synthesize criteria, trade-offs, and next action
```

## Evidence Requirements

For every material claim, cite a direct source location and record version/date and evidence class. Explain what it proves and what it cannot prove. For experiments, provide environment, setup, inputs, output, and reproducible command or test. `CONFIRMED` means directly verified behavior for the applicable version/environment; `HIGH CONFIDENCE` means strong primary evidence with minor residual applicability uncertainty; `POSSIBLE` means source or context remains incomplete; `SPECULATIVE` is unverified and non-blocking. An official source can confirm its contract but not an unrelated performance or suitability inference.

## False Positives

Official documentation may be outdated, incomplete, or authoritative only for supported behavior; verify version and claim. Source code on the default branch may not match the installed release. Maintainer comments can be proposals or personal opinions. Production use proves feasibility in that context, not correctness locally. Benchmarks do not generalize beyond their workload. Several articles repeating one unsourced claim are not corroboration. Do not over-research a reversible low-risk choice, recommend a new dependency for a solved local problem, or present preference as technical necessity.

## Output Format

Lead with the answer and decision boundary, not research chronology:

```markdown
### Recommendation
<specific choice, applicable versions/conditions, and next implementation step>

### Evidence
- <claim -> primary source or reproducible observation -> confidence>

### Alternatives and trade-offs
| option | fit | risks/costs | reason accepted or rejected |

### Adaptation and verification
<local changes, migration/rollback, test or measurement gate>

### Remaining uncertainty
<unknowns and what would resolve them>
```

Consolidate sources under the claims they support. Never finish with only links, and clearly label inference, unsupported assumptions, and conflicts among sources.
