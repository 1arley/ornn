# Build

`ornn build` generates gateway-first provider distributions from the canonical
library. The default exposes one public skill and carries the remaining knowledge as
private reference files.

```bash
ornn build                         # build all providers
ornn build --providers claude,codex # build specific providers
ornn build --profile full          # compatibility/development distribution
```

## What happens

1. The catalog scans canonical skills and supporting library artifacts.
2. The `gateway` profile selects `ornn` as the only public skill.
3. Specialist skills become ordinary `.md` files under `ornn/reference/modules/`;
   catalogs, commands, recipes, patterns and shared knowledge remain private payload.
4. The provider adapter transforms the public `SKILL.md`.
5. `manifest.json` records source identity, provider, profile and public skill list.

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
│   └── skills/ornn/      # public gateway + private reference payload
├── claude/
│   ├── manifest.json
│   └── skills/ornn/      # public SKILL.md transformed for Claude
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
  "profile": "gateway",
  "skills": [{ "id": "meta/ornn", "name": "ornn" }]
}
```

## Design principles

- **Single source of truth.** All provider output is derived from `skills/`. Never
  edit `dist/` directly.
- **Deterministic.** The same source produces the same output. No external calls, no
  randomness.
- **Small public surface.** `gateway` is the default; `full` is explicit.
- **Provider count is not fixed.** Adding a provider is a catalog + integration change,
  not a build system change. See [providers](providers.md).
