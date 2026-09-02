# Architecture

Ornn is a portable knowledge layer, not the agent that executes work.

```text
KNOWLEDGE    skills + references + patterns + templates + collections
DISCOVERY    ornn Gateway + catalog + internal router + resolver
COMPOSITION  recipes + commands
TOOLING      CLI + detectors + validators
ADAPTATION   integrations
EXECUTION    consuming agent
```

`skills/` is the canonical skill source. `scripts/build`/the CLI build command applies
thin provider adapters and writes `dist/<provider>/`; generated output is never an
authoring surface. The installer can copy either all skills or a selection resolved
from a collection, recipe or command.

Legacy routing, eval and findings scripts remain optional deterministic tools. They
may recommend knowledge or consolidate evidence, but they are not the product
pipeline and no skill depends on them.

The public Gateway is a thin layer over that existing infrastructure:

```text
/ornn request → intent normalization → catalog/router → Knowledge Plan
              → selected files only → consuming agent executes
```

`planKnowledge()` is metadata-first and `loadKnowledgePlan()` is the explicit lazy
loading boundary. This separation prevents routing from requiring the entire library
in context and leaves future semantic ranking as an optional layer, not a dependency.

`catalog/library.json` versions the canonical library release and declares supported
change classes. Individual patterns, recipes, collections and integrations also carry
their own semantic versions; provider manifests record the source release.

## Boundaries

- A skill teaches investigation and verification without invoking other skills.
- A pattern describes problem, interaction, states, motion, accessibility, references
  and trade-offs without prescribing project code.
- A recipe declaratively recommends a composition; `execution: external-agent` is
  explicit.
- A collection is an install/discovery bundle.
- A command is an intent alias pointing to existing content.
- A detector emits deterministic evidence; an agent or review interprets it.
- `PRODUCT.md` and `DESIGN.md` belong to consumer projects, never global Ornn memory.

## Compatibility

Provider destinations and installation manifests retain the v2 format. The
`ornn-forge` executable, graph/eval commands and routing catalog remain available for
existing users while the primary UX is `ornn list/search/show/install/init/update`.
