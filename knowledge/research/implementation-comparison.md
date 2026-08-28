# Implementation Comparison

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Implementation comparison** is the discipline of comparing how real projects solve
a problem and extracting the pattern, not copying the code. The goal is to understand
why an approach works, where it trades off, and what must be adapted for the current
system. A comparison is evidence, not a specification.

## Why does it fail

1. **Copying without understanding**: the code is pasted; the invariants it
   enforces are not transferred.
2. **Comparing incomparable systems**: a single-tenant CRUD app's pattern is
   applied to a distributed payment system without adjusting for scale or failure
   models.
3. **Version mismatch**: the pattern is from an old version of the framework and
   no longer applies.
4. **Ignoring the context of the trade-off**: the reference project chose X because
   of its constraints; those constraints are not stated or considered.
5. **Surface similarity over mechanism**: two projects look the same at the API
   level but differ fundamentally in transactionality, idempotency, or error
   handling.

## What invariants matter

```text
a comparison states what is being compared (component, version, scale)
the mechanism is explained, not just the API surface
trade-offs and context are recorded
adaptation notes say what changes for the current system
```

## Patterns

- **Dimension-based comparison**: compare along explicit axes — architecture,
  database, API design, error handling, idempotency, testing, licensing — not
  holistically.
- **Mechanism extraction**: for each reference, answer "what invariant does this
  enforce and how?" Then decide whether the current system needs that invariant.
- **Context annotation**: record the reference project's scale, language, and
  failure model; treat them as parameters, not absolutes.
- **Adaptation section**: for each adopted pattern, list the specific changes
  (schema, middleware, language feature) required in the current codebase.

## What evidence to look for

- The repository's language, framework version, and scale signals.
- The actual mechanism in code (transaction boundaries, idempotency keys, retry
  policy) rather than the README claims.
- Test suites that reveal the invariants the authors cared about.
- License and dependency health before adopting code.

## Related skills

`github-reference-research` (locate implementations), `implementation-research`
(technical depth), `reference-research` (catalog), `research-router` (source
routing).