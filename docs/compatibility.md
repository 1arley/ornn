# Compatibility and migration

Canonical skills use portable `SKILL.md` directories with standard name,
description and license fields. Ornn-specific metadata remains namespaced. Generic,
Claude, OpenCode, Codex and Cursor distributions are generated from that source;
provider manifests prove build compatibility, while real harness invocation should be
recorded separately before claiming end-to-end support for a provider version.

## Existing users

- The npm package remains `ornn-forge`; both `ornn` and `ornn-forge` executables work.
- Manifest v1 and v2 installations remain readable.
- `graph`, `eval`, router and findings tooling remain available but optional.
- Existing skill directories are skipped unless `--force` is explicit.
- Updates use recorded destinations and preserve the installed collection selection.

## Provider matrix

| Provider | Adapter/build | Project target | Global target |
|---|---|---|---|
| Generic | identity | `.agents/skills` | `~/.agents/skills` |
| Claude Code | Claude frontmatter | `.claude/skills` | `~/.claude/skills` |
| OpenCode | identity | `.opencode/skills` | `~/.config/opencode/skills` |
| Codex | identity | `.codex/skills` | `~/.codex/skills` |
| Cursor | identity | `.cursor/skills` | `~/.cursor/skills` |

Add providers through `catalog/providers.json` and `integrations/<provider>/`, keeping
skill logic canonical and testing destination, format, discovery and invocation.
