# Ornn

> **Ornn is a portable skill library for AI coding agents.**

Ornn is the reusable knowledge layer that makes Claude Code, OpenCode, Codex,
Cursor and other agents better at engineering, frontend, UX, security,
reliability, product and research. The consuming agent executes the work; Ornn
provides skills, references, patterns, recipes, collections and deterministic
signals.

Ornn is not an autonomous coder, workflow engine or mandatory orchestrator.

## Get started

```bash
npm install -g ornn-forge
ornn init
ornn search animation
ornn show frontend/animation-review
ornn install frontend-craft --providers claude,codex,opencode
```

The package retains `ornn-forge` as a compatibility alias. Content can also be
copied directly from `skills/` without the CLI.

## Discover

```bash
ornn list
ornn search ux
ornn search security
ornn show frontend/animated-tabs
ornn show design
```

Search spans skills, patterns, recipes, collections and intent commands. `show`
displays canonical content; it never runs a skill.

## Install and update

```bash
ornn install
ornn install accessibility
ornn install frontend/ux-review
ornn install --scope global --providers claude,codex
ornn update
```

Installations are additive by default. Existing directories are preserved unless
`--force` is explicit, and the manifest records only files managed by Ornn.

## Source and distribution

```text
KNOWLEDGE     skills/ references/ patterns/ templates/ collections/
COMPOSITION   recipes/ commands/
TOOLING       CLI + detectors/ + scripts/
ADAPTATION    integrations/
OUTPUT        dist/ (generated; never edit manually)
EXECUTION     consuming agent
```

```bash
ornn build
ornn build --providers generic,claude,codex
```

## Deterministic evidence

Detectors are optional and require no API key or LLM:

```bash
ornn detect src
ornn detect src --json
```

Detector output is evidence for review, not an automatic verdict.

## Project context

Projects may keep durable facts in `PRODUCT.md` and design decisions in `DESIGN.md`.
Ornn recognizes them when present but never stores project-specific memory globally.
See [project context](docs/project-context.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Concepts](docs/concepts.md)
- [Architecture](docs/architecture.md)
- [Skills](docs/skills.md), [patterns](docs/patterns.md), [recipes](docs/recipes.md),
  [collections](docs/collections.md), [references](docs/references.md)
- [Integrations](docs/integrations.md), [commands](docs/commands.md),
  [detectors](docs/detectors.md), [philosophy](docs/philosophy.md)

## Development

```bash
npm test
npm run validate
npm run build
npm pack --dry-run
```

Canonical source is versioned; generated manifests retain source identity so
multiple providers consume the same knowledge without duplication.
