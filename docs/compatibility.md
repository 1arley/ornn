# Compatibility

## Agent Skills standard

The source format is compatible with the open Agent Skills specification. Each
`SKILL.md` has `name`, `description`, and `license` as top-level fields; project-
specific routing data is namespaced under `metadata.aes-*`. A generic Agent Skills
client reads the standard fields; the project's router reads the `aes-*` keys.

## Matrix

| Client | Install | Discovery | Invoke | Tested version | Status |
|---|---|---|---|---|---|
| Claude Code | yes | yes | yes | latest | supported |
| OpenCode | yes | yes | untested | latest | supported* |
| Cursor | untested | untested | untested | — | untested |
| OpenAI Codex | untested | untested | untested | — | untested |
| Gemini CLI | untested | untested | untested | — | untested |

\* OpenCode's project and global skill locations (`~/.config/opencode/skills`)
and its Agent Skills frontmatter compatibility are verified against the
official OpenCode documentation; skill invocation was not run end-to-end by the
maintainers.

### Status definitions

- **supported**: tested by the maintainers; bugs are a priority.
- **untested**: not yet verified; may work with adaptation.
- **community reported**: reported working by a third party; not verified by
  maintainers.
- **unsupported**: known incompatibility.

## Installing from the repository

### Generic Agent Skills client

```bash
npx skills add 1arley/1arley-agent-skills
```

### Direct clone

```bash
git clone https://github.com/1arley/1arley-agent-skills.git
cd 1arley-agent-skills
python3 scripts/validate.py
```

## The project's own CLI

```bash
npx ornn-forge install [--universal] [--destination <dir>] [--providers <list>] [--scope project|global] [--link] [--force] [--dry-run]
npx ornn-forge validate
npx ornn-forge doctor
npx ornn-forge list
npx ornn-forge graph [--out <file>]
npx ornn-forge eval [--json]
```

The CLI is the recommended way to install. It adapts the frontmatter to each
destination's format (e.g. `user_invocable: true` for Claude Code) and preserves
the portable source format in the repository. Destination profiles are loaded
from `catalog/providers.json`.

## Adding a new client

To test a new client, verify:

1. The client reads `SKILL.md` by path and recognizes `name` + `description`.
2. The client can invoke the skill or load it into its context.
3. The `metadata.aes-*` namespace is ignored (not treated as a routing error).
4. The `references/` YAML catalogs are readable or safely ignored.
5. The `AGENTS.md` global rules load correctly.

Report the results so the matrix can be updated.