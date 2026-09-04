---
name: github-reference-research
description: Compares concrete feature mechanisms in active source repositories, evaluating context, code, tests, maintenance, security, adoption, and license to extract adaptable patterns without copying.
license: MIT
metadata:
    aes-category: research
    aes-priority: medium
---

# GitHub Reference Research

## Objective

Use source repositories to explain how real implementations enforce a feature's invariants, then derive context-aware patterns without treating popularity or copyable code as proof of suitability.

## When to Use

Use this skill when the unresolved question requires reading repository code, tests, history, issues, or architecture: how a feature is structured, persisted, exposed, recovered, or evolved. It is appropriate for evaluating an open-source project as a dependency or implementation reference.

Do not use it for general product UX comparison (`market-research`), a narrow question answerable by official documentation alone (`implementation-research`), or catalog lookup alone (`reference-research`). Combine them only when repository evidence is one distinct input. Repository research may inform a design, but it does not authorize copying code or adopting a dependency.

## Mental Model

A repository is a contextual case study, not a best-practice certificate:

```text
target invariant/question
    -> comparable repository + relevant version
    -> code path + schema/API + tests + history
    -> mechanism and assumptions
    -> health/license/security constraints
    -> transferable pattern and required adaptation
```

Evaluate comparability before quality. Language, framework version, deployment model, scale, tenancy, consistency, and failure model can make a sound pattern unsuitable. Stars and forks are discovery signals; the implementation and its operating context are evidence.

## Investigation Procedure

1. Define the feature, invariant, and comparison dimensions needed; avoid a generic request to find "good repositories."
2. Find candidates through relevant catalog queries, official organizations, code search, and dependency ecosystems. Establish repository identity and canonical upstream.
3. Triage comparability, maintenance, release cadence, security posture, documentation, test depth, adoption signals, and license. Record unknowns rather than fabricating scores.
4. Pin the inspected commit, tag, or release and relevant framework/runtime versions.
5. Trace the feature end to end through entry point, domain logic, persistence, external effects, errors, and tests. Read history/issues only where they explain a decision or known limitation.
6. Extract the mechanism and invariant it enforces, not merely filenames or API shape.
7. Compare at least one alternative when the decision is consequential; explain differences through context rather than ranking repositories globally.
8. Assess reuse separately: conceptual adaptation, compatible dependency adoption, or code reuse each has different license and maintenance obligations.
9. Map the pattern to the current project and state required changes, rejected assumptions, risks, and a verification step.

## Questions to Ask

* Is this repository comparable in domain, scale, tenancy, and failure model?
* What exact commit/version was inspected, and is it maintained or archived?
* Where is the mechanism implemented, and what invariant do tests demonstrate?
* Does the README claim match code and current releases?
* How are errors, concurrency, migrations, compatibility, and observability handled?
* Is the feature core architecture or incidental example code?
* Are activity and adoption signals meaningful, manipulated, or irrelevant?
* What license covers the relevant code, examples, assets, and dependencies?
* Which idea transfers without importing repository-specific coupling?
* What evidence would falsify the proposed adaptation?

## Attack Patterns

```text
README-only inference
    README claims safe retries -> trace handler, persistence, and tests

popularity substitution
    many stars -> inspect maintenance, security, mechanism, and comparability

example-as-production
    sample code omits errors/auth/concurrency -> locate production path or downgrade

version mismatch
    inspect main branch while project depends on old release -> pin matching tag

surface similarity
    same endpoint shape -> different consistency/failure guarantees

license blind spot
    attractive snippet -> unclear/incompatible license or copied assets
    -> extract concept only or reject reuse

single-case certainty
    one repository uses pattern X -> compare alternative or constrain conclusion
```

## Evidence Requirements

Name repository, canonical URL, commit/tag, relevant files/tests/issues, language/framework versions, license, and inspection date. For each extracted pattern, show the code-level mechanism, invariant, contextual assumption, and adaptation. `CONFIRMED` means direct inspection proves the repository uses the mechanism at the pinned revision; it does not confirm suitability for the current project. `HIGH CONFIDENCE` supports applicability with comparable context and corroboration; `POSSIBLE` leaves mechanism or transferability incomplete; `SPECULATIVE` is unverified and non-blocking.

## False Positives

Recent commits do not guarantee feature maintenance; a stable mature repository may change rarely. Many open issues do not necessarily mean poor health, and low stars do not invalidate clear code evidence. Tests show intended behavior, not production scale. A permissive license does not remove attribution, notice, patent, trademark, or dependency obligations. Architectural complexity may be justified by the reference's context but harmful locally. Do not label a different design defective merely because references converge on another pattern.

## Output Format

Synthesize by mechanism rather than repository list:

```markdown
### Mechanism
**Repositories inspected:** <repo, revision, relevant paths>
**Invariant and implementation:** <how it works>
**Context and quality:** <comparability, tests, maintenance, security, adoption>
**License/reuse boundary:** <concept, dependency, or code reuse implications>
**Adaptation:** <changes required locally>
**Trade-offs / alternative:** <what this choice costs>
**Confidence:** <repository fact vs applicability>
**Recommendation:** <specific decision and verification step>
```

List rejected candidates briefly with reasons. Never paste substantial source code, clone branding, or imply that repository popularity establishes correctness.
