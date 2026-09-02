# AGENTS.md — Guidance for agents consuming Ornn

> **Don't just review the code. Attack the assumptions behind the system.**

Ornn is a portable knowledge library. The consuming agent owns execution. Skills
teach how to think, references show where to look, recipes suggest compositions,
detectors provide mechanical signals, and integrations adapt source for a provider.
None is a mandatory runtime or controller.

## Investigation principles

- Investigate before concluding; every finding needs evidence.
- Identify invariants and reason about before/after and impossible states.
- Test repetition, reversal, retry, replay and concurrency when relevant.
- Do not trust client-controlled identity, role, price, reward or ownership.
- Treat APIs as directly accessible, independently of UI restrictions.
- Research proportionally to uncertainty, impact and irreversibility.
- Treat references according to their evidence type; never copy branding,
  proprietary code or identity blindly.
- Consult each selected skill's false-positive guidance.

## Evidence levels

```text
CONFIRMED        reproduced with direct observed evidence
HIGH CONFIDENCE exact mechanism plus concrete structural evidence
POSSIBLE         mechanism or evidence remains incomplete
SPECULATIVE      risk without sufficient evidence; never a blocking bug
```

Recalculate confidence from consolidated evidence. Findings should include
reproduction, mechanism/root cause, impact, evidence and provenance.

## Recommended methodology

```text
UNDERSTAND → CLASSIFY → RESEARCH → COMPARE → DECIDE → IMPLEMENT → VERIFY
```

This is guidance, not an Ornn-controlled workflow. Use a recipe when it fits and let
trivial reversible tasks remain trivial. The optional `meta/skill-router` and
`meta/research-router` teach selection; they do not invoke skills.

## Project context boundary

When present, treat the consumer project's `PRODUCT.md` as durable product context
and `DESIGN.md` as its design contract. Without them, inspect the project and state
necessary assumptions. Never copy project facts into Ornn source.

```text
Ornn      reusable knowledge
Project   PRODUCT.md + DESIGN.md + application code
Agent     execution context and decisions
```

## Repository contracts

- Edit canonical content, never generated `dist/` output.
- Keep skills self-contained and agent-agnostic; do not require an Ornn executor.
- Put composition in `recipes/`, bundles in `collections/`, conceptual solutions in
  `patterns/`, URLs in `references/`, and mechanical checks in `detectors/`.
- Preserve compatibility intentionally and validate relevant changes.
- Synthesize research as pattern, relevance, adaptation, trade-offs and
  recommendation; do not return a link dump.

Detailed philosophy and authoring rules live in `docs/`.
