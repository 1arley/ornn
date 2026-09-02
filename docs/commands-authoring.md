# Command Authoring

Commands are intent aliases. They provide a small discovery surface — such as
`design`, `audit`, `research` or `security` — that points to existing skills,
recipes and collections. Running `ornn show design` explains the capability; it
never runs an agent.

## Location

```text
commands/<name>.yaml
```

One file per command. The filename is the command identifier.

## Schema

```yaml
schema_version: 1
version: 1.0.0
name: design
description: Discover Ornn knowledge for designing or redesigning an interface.
recipes:
  - frontend/redesign
collections:
  - frontend-craft
```

| Field | Type | Required | Description |
|---|---|---|---|
| `schema_version` | number | yes | Schema version. Always `1`. |
| `version` | string | yes | Semantic version of this command. |
| `name` | string | yes | Identifier, kebab-case. Matches the filename. |
| `description` | string | yes | What this command helps discover. |
| `recipes` | list[string] | no | Recipe identifiers this command references. |
| `collections` | list[string] | no | Collection identifiers this command references. |
| `skills` | list[string] | no | Direct skill identifiers (rare; prefer recipes). |
| `patterns` | list[string] | no | Pattern identifiers this command references. |
| `references` | list[string] | no | Reference catalog aliases to load alongside. |

A command must reference at least one recipe, collection, skill or pattern.

## Resolution

When the user runs `ornn show <command>` or `ornn install <command>`, the library
resolves the command's references recursively:

1. Recipes list skills and reference catalogs.
2. Collections list skills.
3. Direct skill and pattern identifiers are resolved as-is.

The result is a flat set of installable skill IDs plus any reference catalogs and
patterns the user can inspect.

## Validation

```bash
python3 scripts/validate.py
```

The validator checks:

- `name` matches the filename.
- All referenced recipes, collections, skills and patterns exist in the library.
- `schema_version` and `version` are present.
- `description` is non-empty.

## Examples

See `commands/design.yaml`, `commands/audit.yaml` and `commands/security.yaml` for
existing commands.
