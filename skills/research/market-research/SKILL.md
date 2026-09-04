---
name: market-research
description: Compares observable behavior across relevant real products to identify product and UX patterns, differences, and context-specific opportunities without confusing popularity with evidence.
license: MIT
metadata:
    aes-category: research
    aes-priority: medium
---

# Market Research

## Objective

Compare how relevant real products handle a defined user problem and turn direct behavioral evidence into context-aware product options and recommendations.

## When to Use

Use this skill for competitor or analogue comparisons involving onboarding, navigation, information architecture, interactions, empty/error/loading states, mobile behavior, terminology, pricing presentation, or workflow design. It answers "How do products handle this experience?" rather than "How is it implemented in code?"

Do not use it for market sizing, investment diligence, demand validation, or repository architecture. Use `github-reference-research` for source implementation, `implementation-research` for technical decisions, and `reference-research` for cataloged methodology or heuristics. Compose when an explicit question needs both product behavior and another evidence class.

## Mental Model

Products are observations shaped by different users, business models, maturity, experiments, regulation, and technical constraints:

```text
defined user problem + target context
    -> comparable competitors and analogues
    -> same scenario and dimensions
    -> observed behavior and state coverage
    -> convergence, divergence, and missing options
    -> adaptation with local constraints
```

Market convergence shows convention, not causality or success. A visible design does not reveal conversion, user satisfaction, internal experiments, or scale. Compare mechanisms and consequences, not visual polish, and separate observation from inference.

## Investigation Procedure

1. Define the user problem, decision, target segment, platform, geography, and states in scope.
2. Select a small purposeful sample: direct competitors for convention, adjacent analogues for alternatives, and counterexamples when useful. Explain comparability; do not equate brand fame with relevance.
3. Define comparison dimensions before observation to limit cherry-picking. Include only dimensions relevant to the decision.
4. Reproduce the same scenario in each accessible product, including first use, populated state, loading, error, empty, permission, destructive action, mobile, and recovery where applicable.
5. Record direct evidence with date, platform/version, account tier, locale, entry path, and screenshots/notes when permitted. Mark marketing claims and third-party footage as indirect.
6. Build a normalized comparison matrix. Separate facts, interpretations, and unknown states.
7. Identify convergence, meaningful divergence, omissions, and contextual explanations. Do not infer that majority behavior is optimal.
8. Compare patterns with the current product's users, goals, content, risk, design contract, and technical constraints.
9. Recommend adopt, adapt, experiment, or reject. Specify success criteria when evidence cannot decide between options.
10. Stop when new products repeat known patterns without changing the decision.

## Questions to Ask

* What user problem and decision are being researched?
* Which products are genuinely comparable, and which analogues broaden the option space?
* Was the same scenario, tier, locale, and platform observed?
* Which states were directly exercised, and which remain inferred or inaccessible?
* What behavior, wording, hierarchy, feedback, and recovery were observed?
* Where do products converge, and could convention, regulation, or imitation explain it?
* Where do they diverge, and which contextual constraint explains each choice?
* What is absent across products but required locally?
* Which recommendation needs an experiment or user evidence rather than imitation?

## Attack Patterns

```text
prestige sampling
    select famous products regardless of target/user problem
    -> replace with direct competitors and relevant analogues

happy-path benchmark
    compare polished populated screens only
    -> exercise empty, loading, error, permissions, recovery, and mobile

screenshot inference
    infer interaction and outcomes from a static image
    -> observe directly or lower confidence

false convergence
    three products share a pattern because they copied one another
    -> treat as convention, not proof of effectiveness

incomparable tiers
    compare enterprise admin flow with consumer free flow
    -> normalize context or disclose mismatch

visual copying
    reproduce competitor branding/layout without local rationale
    -> extract the product principle and redesign for local identity
```

Respect terms, privacy, access controls, trademarks, and copyright. Do not create deceptive accounts or bypass paywalls to complete a benchmark.

## Evidence Requirements

For each observation, name product, scenario, platform/version, tier, locale, date, and direct evidence. Label inaccessible or second-hand states. Support convergence with independent comparable observations; one product can confirm its own behavior, not a market pattern. `CONFIRMED` means the stated behavior was directly observed under recorded conditions; `HIGH CONFIDENCE` means a pattern is corroborated across suitable products; `POSSIBLE` means context or access is incomplete; `SPECULATIVE` is unobserved inference and non-blocking. Never infer business performance from UI presence alone.

## False Positives

Popularity, longevity, polish, and apparent scale do not prove that a pattern works. Different behavior may be correct for a different segment, platform, regulation, or business model. Missing states may be inaccessible rather than absent. A marketing demo is not equivalent to the live product. Multiple products owned by one company or sharing a design system are not independent corroboration. Convention may improve familiarity but still conflict with local goals or accessibility. Do not treat divergence as differentiation opportunity until user value and cost are established.

## Output Format

Lead with the decision and normalized matrix, then synthesize patterns rather than writing one disconnected block per product:

```text
dimension/state | product A | product B | analogue C | local implication | evidence
```

For each material pattern provide observations, convergence/divergence, relevance, adaptation, trade-offs, confidence, and recommendation. End with inaccessible states, sample limitations, rejected comparisons, and experiments needed. Recommendations must say adopt, adapt, test, or reject and must not copy branding, proprietary content, or identity.
