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
| Cursor | not tested | not tested | not tested | — | untested |
| OpenCode | not tested | not tested | not tested | — | untested |
| OpenAI Codex | not tested | not tested | not tested | — | untested |

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
npx agent-engineering-skills install [--target <dir>] [--link] [--force] [--dry-run]
npx agent-engineering-skills validate
npx agent-engineering-skills doctor
npx agent-engineering-skills list
npx agent-engineering-skills graph [--out <file>]
npx agent-engineering-skills eval [--json]
```

The CLI is the recommended way to install into Claude Code. It adapts the frontmatter
to the native Claude Code format (`user_invocable: true`) and preserves the
portable source format in the repository.

## Adding a new client

To test a new client, verify:

1. The client reads `SKILL.md` by path and recognizes `name` + `description`.
2. The client can invoke the skill or load it into its context.
3. The `metadata.aes-*` namespace is ignored (not treated as a routing error).
4. The `references/` YAML catalogs are readable or safely ignored.
5. The `AGENTS.md` global rules load correctly.

Report the results so the matrix can be updated.