# Source Authority

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Source authority** is the measure of how much a source can be trusted to describe
how something *actually works* versus how someone *thinks it should* work. Authority
comes from proximity to the source of truth: the vendor's own documentation, the code
itself, or the maintainer's statement — not from the polish of the presentation.

Authority levels used by this project:

```text
established   — official docs, standards, the source of truth itself
community     — production code, active repositories, maintainer discussions
vendor        — vendor docs, which may be aspirational or self-interested
curated       — hand-picked collections (design systems, methodology lists)
```

## Why does it fail

1. **Polished ≠ authoritative**: a beautiful blog post can be wrong for the current
   version; official docs are the safer default.
2. **Vendor docs are persuasive but self-serving**: a cloud provider's docs may
   describe their product's ideal usage, not the community best practice.
3. **The author of a repo is not the authority on your system**: production code is
   evidence of *what people do*, not necessarily *what is correct*.
4. **Outdated official docs**: the official page may lag the actual behavior; code
   and changelogs are fresher.
5. **Authority is claimed, not verified**: a secondary source cites the primary
   without linking it; the claim is unverifiable.

## What invariants matter

```text
the source's authority is stated explicitly
official/primary sources are preferred when they exist
a secondary source is traced to its primary
conflicting authorities are surfaced, not hidden
```

## Patterns

- **Prefer primary over secondary**: link to the official doc, not to a blog that
  summarizes it. Read the code, not only the README.
- **Trace claims**: for a configuration claim, find it in the official docs or the
  changelog that introduced it.
- **Version-pinned authority**: record the version the source refers to; a claim
  may only be true for that version.
- **Authority caveats**: `vendor` sources are flagged for self-interest;
  `community` sources for the absence of official coverage; `inspiration` for
  non-specification use.

## What evidence to look for

- The source type in the references catalog.
- The URL's domain and its relationship to the technology vendor.
- The repository's ownership and maintenance signals.
- The presence of a changelog, release notes, or version tags.
- Whether the claim can be reproduced from the primary source.

## Related skills

`reference-research` (catalog authority), `implementation-research` (technical
verification), `github-reference-research` (repo evaluation), `research-router`
(source selection).