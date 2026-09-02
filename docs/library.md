# Library

The library is Ornn's unified catalog of all canonical knowledge: skills, patterns,
recipes, collections and commands. It is the single source of truth for search,
installation and validation.

## Structure

```text
skills/          canonical SKILL.md directories
patterns/        transferable solution descriptions
recipes/         declarative skill compositions
collections/     install-and-discovery bundles
commands/        intent aliases pointing to other content
references/      external source catalogs
```

## Versioning

`catalog/library.json` declares the library release version:

```json
{
  "schemaVersion": 1,
  "sourceVersion": "1.0.0",
  "versioning": "library-release",
  "content": ["skills", "references", "patterns", "recipes", "collections", "integrations"],
  "changeTypes": ["added", "changed", "deprecated", "removed"]
}
```

Individual patterns, recipes, collections and commands also carry their own `version`
field in their YAML files. Provider manifests record the `sourceVersion` from
`library.json` at build time.

## How it works

`src/library/catalog.js` scans the filesystem for all content types:

| Type | Root directory | Filename |
|---|---|---|
| skill | `skills/` | `SKILL.md` |
| pattern | `patterns/` | `pattern.yaml` |
| recipe | `recipes/` | `*.yaml` |
| collection | `collections/` | `collection.yaml` |
| command | `commands/` | `*.yaml` |

Each item is indexed by `id` (filesystem path relative to root) and `name` (from
the YAML `name` field). The library is loaded on demand — there is no pre-built
index.

## Search

`ornn search <query>` splits the query into terms and matches against `id`, `name`,
`description` and full content. All terms must match (AND logic). Optionally filter
by type:

```bash
ornn search ux                    # search all types
ornn search animation --type skill # search skills only
```

## Resolution

`ornn show <name>` resolves an identifier by:

1. Exact match on `id` or `name`.
2. Suffix match on `id` (e.g. `animation-review` matches `frontend/animation-review`).

Collections, recipes and commands resolve recursively — installing a collection
resolves its skill list, and a command resolves its referenced collections and
recipes.

## Validation

```bash
python3 scripts/validate.py
```

The validator checks:

- Every skill has a catalog entry and vice versa.
- `name` is unique across the library.
- `composes_with` and `overlaps_with` point to existing skills.
- `role`, `category`, `priority` and `risk_floor` belong to their enums.
- No impossible circular dependencies exist.
- Descriptions follow the Agent Skills pattern.
- Frontmatter is portable (no proprietary top-level fields).
