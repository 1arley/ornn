# Evidence Quality

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Evidence quality** is the hierarchy of reliability for sources used in research.
Not all sources are equally reliable, and the confidence of a recommendation depends
on the quality of the evidence that supports it. The agent must distinguish between
specification, observation, opinion, and inspiration.

Hierarchy (most reliable first):

```text
official documentation (version-matched)
production code in active repositories
peer-reviewed literature / established standards
maintainer explanations and changelogs
technical articles with reproduction
blog posts and tutorials
gallery/inspiration without behavioral details
```

## Why does it fail

1. **One source treated as truth**: a single blog post or star count is used as
   the sole justification for a recommendation.
2. **Version not matched**: a recommendation from a different version is applied
   without adaptation.
3. **Inspiration treated as specification**: a gallery screenshot is used as a
   product requirement, ignoring accessibility, behavior, and edge cases.
4. **Dead project recommended**: a repository archived two years ago is
   recommended as a production dependency without a lifecycle warning.
5. **License ignored**: code from a GitHub project is copied without checking the
   license compatibility.
6. **Confirmation bias**: only sources that confirm the hypothesis are cited;
   contradictory evidence or trade-offs are omitted.

## What invariants matter

```text
every recommendation is grounded in at least one source
the source's authority is stated, not assumed
a non-authoritative source is flagged as such
a dead or archived project carries a warning
trade-offs and alternatives are included alongside the recommendation
```

## Patterns

- **Source taxonomy**: mark each source as `official`, `implementation`,
  `heuristic`, `opinion`, or `inspiration`.
- **Version annotation**: include the version or date of the source in the
  recommendation.
- **Multi-source corroboration**: cross-check a claim across at least two
  independent sources; flag when only one exists.
- **Lifecycle awareness**: before recommending a repository, check its last commit
  date, open issues, and security advisories.
- **Trade-off synthesis**: for each recommendation, list one alternative, one
  limitation, and one context where it does not apply.

## What evidence to look for

- The type and authority of the source (from the references catalog or direct
  inspection).
- The version or date of the documentation, code, or article.
- The repository's activity metrics (last commit, open issues, stale PRs).
- The license file and its compatibility with the project.
- Whether contradictory sources are cited and addressed.

## Related skills

`reference-research` (catalog lookup), `github-reference-research` (repository
evaluation), `implementation-research` (technical depth), `research-router` (source
routing).