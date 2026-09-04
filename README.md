# Ornn

> **Install Ornn, then tell your agent what you want with `/ornn`.**

[![npm version](https://img.shields.io/npm/v/ornn-forge.svg?label=npm)](https://www.npmjs.com/package/ornn-forge)
[![CI](https://img.shields.io/github/actions/workflow/status/1arley/ornn/ci.yml?branch=main&label=CI)](https://github.com/1arley/ornn/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/ornn-forge.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/ornn-forge)](https://nodejs.org)

`/ornn` is the universal discovery gateway. It interprets intent, selects and lazily
loads a compact set of canonical knowledge, then hands control back to the consuming
agent. Ornn is not an autonomous coder, workflow engine or mandatory orchestrator.

The consuming agent executes the work. Ornn provides the knowledge. It is not an
autonomous coder, a workflow engine or a mandatory orchestrator — there is no runtime
to run and no dependency beyond Node 18+ for the optional CLI.

## What's inside

| Concept | Purpose |
| --- | --- |
| [Skills](docs/skills.md) | Mental models, questions, investigation and evidence for a domain |
| [References](docs/references.md) | Centralized, versioned catalogs of where to look |
| [Patterns](docs/patterns.md) | Transferable solutions with states, motion and trade-offs |
| [Recipes](docs/recipes.md) | Declarative compositions of skills for a task |
| [Collections](docs/collections.md) | Install-and-discovery bundles such as `frontend-craft`, `security`, `react` |
| [Commands](docs/commands.md) | Intent aliases such as `design`, `audit`, `research` |
| [Detectors](docs/detectors.md) | Optional deterministic checks that run without an LLM |
| [Integrations](docs/integrations.md) | Provider adapters from canonical source to `dist/` |

## Install

The npm package is `ornn-forge` and exposes both `ornn` and `ornn-forge`. Zero runtime
dependencies.

```bash
npm install -g ornn-forge
ornn init
ornn install --providers claude,codex,opencode
```

Then, in the installed agent:

```text
/ornn review the security of this endpoint
/ornn improve the accessibility of this interface
/ornn refactor this backend
```

Or run it on the spot with `npx ornn-forge ...`. Content can also be copied straight
from `skills/` without the CLI.

## Quick start

The normal user interface is `/ornn <request>`. Developers can preview its plan:

```bash
ornn discover "review the security of this API"
ornn discover "review the security of this API" --debug
```

Catalog inspection remains available for maintainers and advanced users:

```bash
ornn init                                            # detect providers, suggest collections
ornn search frontend                                 # search all canonical knowledge
ornn show frontend/animation-review                   # view canonical content (never runs it)
ornn install frontend-craft --providers claude,codex  # install a collection, project scope
```

`ornn init` detects providers and common stacks; suggestions are advisory and it never
starts an autonomous session. Use `--yes` to apply detected recommendations.

## Manage knowledge

```bash
ornn list [type]                    # list skills, patterns, recipes, collections...
ornn install                        # public gateway + private knowledge payload
ornn install --profile full         # direct access to every specialist skill
ornn install [item ...]             # explicit selection from a collection/recipe
ornn install --scope global --providers claude,codex
ornn update                         # refresh managed skills
ornn uninstall                      # remove managed skills
ornn doctor                         # diagnose providers and installations
```

The default installation exposes only the `ornn` gateway. Specialist knowledge is
packaged privately and loaded on demand, so Ornn does not crowd the harness skill
list. Installations are additive and recorded in a manifest; existing directories are
preserved unless `--force` is explicit. `--dry-run` previews without writing, and
filesystem guardrails reject unsafe `--force` destinations. Compatible options:
`--scope project|global`, `--providers`, `--universal`, `--destination`, `--link`,
`--profile gateway|full`.

## Deterministic detectors

No API key and no LLM required:

```bash
ornn detect src
ornn detect src --json
```

Detector output is evidence for review, never an automatic verdict.

## Project context

Projects may keep durable facts in `PRODUCT.md` and design decisions in `DESIGN.md`,
plus optional routing context and pins under `.ornn/`. Ornn recognizes them when
present but never stores project-specific memory globally.
See [project context](docs/project-context.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Concepts](docs/concepts.md) · [Architecture](docs/architecture.md) ·
  [Philosophy](docs/philosophy.md)
- Content: [skills](docs/skills.md) · [patterns](docs/patterns.md) ·
  [recipes](docs/recipes.md) · [collections](docs/collections.md) ·
  [references](docs/references.md) · [commands](docs/commands.md) ·
  [library](docs/library.md)
- Providers: [providers](docs/providers.md) · [compatibility](docs/compatibility.md) ·
  [integrations](docs/integrations.md) · [build](docs/build.md)
- [Detectors](docs/detectors.md) · [routing](docs/routing.md) ·
  [evals](docs/evals.md) · [skill graph](docs/skill-graph.md)
- Authoring: [contributing skills](docs/contributing-skills.md) ·
  [skill authoring](docs/skill-authoring.md) ·
  [reference authoring](docs/reference-authoring.md) ·
  [command authoring](docs/commands-authoring.md) ·
  [pattern authoring](docs/pattern-authoring.md)
- [Agent integration](docs/agent-integration.md) ·
  [project context](docs/project-context.md) ·
  [release process](docs/release-process.md)

## Development

```bash
npm test            # CLI + Python tests
npm run validate    # structural validator (catalog drift, eval contracts, fixtures)
npm run eval        # deterministic routing evals
npm run build       # generate dist/ for all providers
npm pack --dry-run  # inspect the published package
```

Canonical source lives in `skills/`, `patterns/`, `recipes/`, `collections/`,
`commands/`, `references/` and `integrations/`. Generated `dist/` output is never an
authoring surface. Skills, patterns, recipes and collections are validated against the
catalog and eval cases on CI.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues should be reported through the
process in [SECURITY.md](SECURITY.md). Releases follow [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
