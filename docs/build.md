# Build

`ornn build` generates provider-specific skill distributions from the single canonical
source in `skills/`.

```bash
ornn build                         # build all providers
ornn build --providers claude,codex # build specific providers
```

## What happens

1. The catalog scans `skills/` for all `SKILL.md` directories.
2. For each provider, the corresponding adapter transforms `SKILL.md` content.
3. Output is written to `dist/<provider>/skills/<category>/<skill-name>/`.
4. A `manifest.json` is written to `dist/<provider>/` recording source identity,
   provider name and skill list.

## Adapters

| Adapter | Behavior |
|---|---|
| `identity` | Copies files unchanged. Used by Generic, OpenCode, Codex, Cursor, Gemini CLI. |
| `claude` | Applies Claude-specific frontmatter transformations. |

Adapters live in `src/installer/adapters/`. The identity adapter is the default when
no transformation is needed.

## Output structure

```text
dist/
├── generic/
│   ├── manifest.json
│   └── skills/           # exact copy of skills/
├── claude/
│   ├── manifest.json
│   └── skills/           # SKILL.md files transformed for Claude
├── opencode/
├── codex/
└── cursor/
```

Each `manifest.json` contains:

```json
{
  "generated": true,
  "source": "skills/",
  "integration": "claude",
  "version": "1.0.0",
  "sourceVersion": "1.0.0",
  "skills": [{ "id": "audit/adversarial-review", "name": "adversarial-review" }]
}
```

## Design principles

- **Single source of truth.** All provider output is derived from `skills/`. Never
  edit `dist/` directly.
- **Deterministic.** The same source produces the same output. No external calls, no
  randomness.
- **Provider count is not fixed.** Adding a provider is a catalog + integration change,
  not a build system change. See [providers](providers.md).
