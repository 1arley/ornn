# Providers

Ornn ships with five built-in provider profiles. Each profile defines a target
directory, an adapter, and detection signals so `ornn init` can identify installed
agents automatically.

| Provider | Adapter | Project target | Global target |
|---|---|---|---|
| Generic | identity | `.agents/skills` | `~/.agents/skills` |
| Claude Code | claude | `.claude/skills` | `~/.claude/skills` |
| OpenCode | identity | `.opencode/skills` | `~/.config/opencode/skills` |
| Codex | identity | `.codex/skills` | `~/.codex/skills` |
| Cursor | identity | `.cursor/skills` | `~/.cursor/skills` |
| Gemini CLI | identity | `.gemini/skills` | `~/.gemini/skills` |

## Adapters

Adapters transform canonical `SKILL.md` content from the source `skills/` directory
into provider-specific output during `ornn build`.

- **identity** — copies files unchanged. The Agent Skills format is already compatible.
- **claude** — applies Claude-specific frontmatter transformations.

Adapters live in `src/installer/adapters/`. Adding a new adapter requires a JS
module exporting a `transform(content: string): string` function and a corresponding
entry in `integrations/<provider>/integration.json`.

## Detection

`ornn init` detects installed providers by checking for:

1. **Command availability** — e.g. `which claude`, `which codex`.
2. **Project markers** — directories like `.claude/`, `.codex/`, `.opencode/`.
3. **Global markers** — directories like `~/.claude/`, `~/.codex/`.

Detection is advisory and never claims a provider is fully configured. Evidence is
shown to the user during `init` and `install` so they can decide.

## Adding a new provider

1. Add an entry to `catalog/providers.json` with `id`, `label`, `adapter`,
   `destinations` and `detection`.
2. Create `integrations/<provider>/integration.json` with `schemaVersion`, `version`,
   `name`, `adapter` and `format`.
3. If the provider needs a non-identity adapter, add `src/installer/adapters/<name>.js`.
4. Run `python3 scripts/validate.py` to confirm catalog integrity.
5. Run `ornn build --providers <provider>` to generate `dist/<provider>/`.

No code changes beyond these files are needed. The installer resolves providers from
the catalog at runtime.
