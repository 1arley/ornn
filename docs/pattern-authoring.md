# Pattern Authoring

Patterns describe transferable solutions with states, motion, accessibility and
trade-offs. They are not code — they are knowledge about how a problem is solved
across products.

## Location

```text
patterns/<domain>/<name>/pattern.yaml
```

Currently the only domain is `frontend`. The name is kebab-case and matches the
directory name.

## Schema

```yaml
schema_version: 1
version: 1.0.0
name: animated-tabs
description: Preserve context while switching between related views.
problem: Switching between related content while preserving context and orientation.
interaction: Selection changes the active tab and its associated panel.
states:
  - default
  - hover
  - focus
  - pressed
  - selected
  - entering
  - exiting
motion:
  - active-indicator
  - directional-transition
  - continuity
accessibility:
  - arrow-key-navigation
  - visible-focus
  - selected-state-semantics
  - reduced-motion
references:
  - Animate UI
  - Motion
  - Aceternity UI
  - Headless UI
trade_offs:
  - Directional motion improves orientation but adds interruption and state coordination.
  - A headless primitive improves semantics but requires visual and motion composition.
```

| Field | Type | Required | Description |
|---|---|---|---|
| `schema_version` | number | yes | Schema version. Always `1`. |
| `version` | string | yes | Semantic version of this pattern. |
| `name` | string | yes | Identifier, kebab-case. Matches the directory name. |
| `description` | string | yes | One sentence describing what the pattern achieves. |
| `problem` | string | yes | The problem this pattern solves. |
| `interaction` | string | yes | How the user interacts with the pattern. |
| `states` | list[string] | no | Visual/interaction states the pattern involves. |
| `motion` | list[string] | no | Motion principles or techniques relevant to this pattern. |
| `accessibility` | list[string] | no | Accessibility considerations and requirements. |
| `references` | list[string] | no | Reference catalog names where related sources can be found. |
| `trade_offs` | list[string] | no | Key trade-offs when adopting this pattern. |

## Principles

- **Describe, don't prescribe.** Patterns explain the problem and the solution space,
  not the implementation. The consuming agent or developer chooses the concrete code.
- **States are explicit.** Every interactive pattern declares its states so the agent
  can audit for missing hover, focus, disabled or loading states.
- **Accessibility is not optional.** Patterns include accessibility requirements as a
  first-class field, not an afterthought.
- **Trade-offs are honest.** Every pattern documents what it costs, not just what it
  gains.

## Validation

```bash
python3 scripts/validate.py
```

The validator checks:

- `name` matches the directory name.
- `description`, `problem` and `interaction` are non-empty.
- `schema_version` and `version` are present.

## Examples

See `patterns/frontend/animated-tabs/pattern.yaml`,
`patterns/frontend/interactive-card/pattern.yaml` and
`patterns/frontend/page-transition/pattern.yaml`.
