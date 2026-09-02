# Reference Authoring

How to add external sources to the catalog. References are centralized in
`references/` — never embedded in skills — so the `research-router` can dispatch to
them and `scripts/validate.py` can verify the schema.

## Why centralized

Sites, products and documentation are not scattered across skills. Centralizing avoids:

- Duplicate URLs rotting across multiple skills.
- Skills that become link dumps instead of reasoning.
- Inconsistency about which sources are trustworthy.

```text
skills/        how to think
references/    where to look
```

## Files

```text
references/
├── frontend.yaml
├── ux.yaml
├── engineering.yaml
├── security.yaml
├── product.yaml
└── research.yaml
```

Each file is a YAML list of entries. One file per domain.

## Schema per entry

```yaml
- name: Example
  url: https://example.com
  type: methodology
  category: ux
  authority: established
  use_when:
    - reviewing usability
    - designing flows
  avoid_when:
    - unrelated backend task
  search_queries:
    - "example usability heuristics"
    - "example flow design patterns"
```

| Field | Type | Values |
|---|---|---|
| `name` | string | Recognizable source name. |
| `url` | string | Canonical URL. |
| `type` | enum | `methodology` \| `heuristic` \| `inspiration` \| `implementation` \| `discovery` |
| `category` | string | Domain — matches the file it lives in (`frontend`, `ux`, `engineering`, `security`, `product`, `research`). |
| `authority` | enum | `established` \| `community` \| `vendor` \| `curated` (see below). |
| `use_when` | list[string] | Situations where the source is relevant. |
| `avoid_when` | list[string] | Situations where it is not useful or is misleading. |
| `search_queries` | list[string] | Ready-made queries to feed search. |

## Knowledge classes (`type`)

Not all sources are equal. `type` says **what kind of thing** the source offers:

| `type` | What it is | Example |
|---|---|---|
| `methodology` | A structured method or framework | Laws of UX |
| `heuristic` | Heuristics and applicable principles | Impeccable |
| `inspiration` | Visual inspiration, not prescriptive | Dribbble |
| `implementation` | Concrete code or patterns | Animate UI |
| `discovery` | Tool for discovering more sources | LazyWeb, Shoogle |

## Authority levels (`authority`)

Not every source carries the same weight. `authority` says **how much to trust**:

| `authority` | Meaning |
|---|---|
| `established` | Recognized authority, de facto standard, official documentation. Highest weight. |
| `vendor` | A specific vendor or framework's documentation. Reliable within its domain. |
| `community` | Community wisdom, collective curation. Useful but verify. |
| `curated` | Curated collection (galleries, aggregators). Inspiration; not prescriptive. |

When synthesizing research, `established` and `vendor` sources weigh more than
`curated` and `inspiration`. See `AGENTS.md` section 5 (synthesis) and section 1
(distinguish inspiration from evidence).

## Rules

1. **One source, one entry.** Do not duplicate URLs across files. If a source serves
   multiple domains, pick the primary domain and reference it from the router.
2. **`search_queries` always filled.** The `research-router` and research skills use
   these queries; entries without queries are inactionable.
3. **`use_when`/`avoid_when` specific.** Generic "when useful" does not help the router
   choose between sources.
4. **Inspiration ≠ evidence.** `type: inspiration` or `authority: curated` sources
   alone never justify a technical finding.
5. **Canonical URLs.** Use the root URL or the most stable page, not a deep link that
   may break.

## Validation

```bash
python3 scripts/validate.py
```

The validator checks, for each `references/*.yaml`:

- Syntactically valid YAML;
- every entry has all seven fields;
- `type` and `authority` are valid enums;
- `category` matches the file it lives in;
- `url` is an absolute URL with a scheme;
- `use_when`, `avoid_when`, `search_queries` are non-empty lists.
