---
name: ornn
description: Universal public gateway that discovers and composes the minimum relevant Ornn knowledge for a natural-language task before the consuming agent executes it.
license: MIT
metadata:
    aes-category: meta
    aes-priority: high
    aes-interface: gateway
---

# Ornn Gateway

## Objective

Serve as Ornn's public semantic entry point: turn an explicit Ornn request into a small, traceable knowledge plan, load only the selected artifacts, and return control to the consuming agent for execution.

## When to Use

Use when the user explicitly invokes Ornn, such as `/ornn <task>`, or calls the installed `ornn` gateway skill. Natural-language shortcuts, commands, and project pins enter the same discovery path. A trivial request may select no specialist skill.

Do not make the gateway a mandatory prelude to ordinary tasks, an agent runtime, or a second source of routing rules. In the default distribution profile this is the only public skill and specialist skills are private reference modules; the `full` profile preserves direct specialist installation.

## Mental Model

Keep discovery separate from execution:

```text
request + bounded project signals
        → normalize intent
        → rank catalog metadata
        → resolve explicit selections
        → Knowledge Plan
        → lazy-load selected artifacts
        → consuming agent decides and executes
```

The catalog is the cross-skill source of truth. `skill-router` explains selection policy; `research-router` explains source selection after external knowledge is justified. Recipes compose skills and collections package them; neither executes work. Project context may influence ranking but must not modify canonical Ornn knowledge.

## Investigation Procedure

1. Preserve the original request while removing only the explicit gateway prefix.
2. Read metadata before bodies. In the repository use `catalog/skills.yaml`; in a gateway distribution use `reference/catalog/skills.yaml`.
3. Read only bounded project signals that exist: `PRODUCT.md`, `DESIGN.md`, `.ornn/context.md`, `.ornn/project.md`, `.ornn/preferences.md`, `.ornn/pins.yaml`, and lightweight stack indicators.
4. Normalize supported aliases and project signals without replacing the user's intent. Treat negation and explicit exclusions as constraints.
5. Rank candidates with the existing catalog/router policy: triggers, required signals, risk floor, domain, overlap, composition, and cost. Do not infer that `composes_with` is required.
6. Resolve explicit command, recipe, collection, skill, and pin selectors through the library resolver where the environment exposes them. Merge explicit and ranked skills once and honor exclusions.
7. Build a Knowledge Plan containing selected skills, related artifacts, references, load targets, exclusions, project signals, and optional debug evidence.
8. Load only planned files. In gateway packages specialist content is under `reference/modules/<category>/<skill>.md`; canonical repository content remains under `skills/<category>/<skill>/SKILL.md`.
9. Remove redundant guidance and present the compact context needed for the consuming agent to complete the original task.
10. Expose candidates, scores, budget, and loaded paths only for debugging or when the user requests the rationale.

When repository code is available, `planKnowledge()` is the metadata-first boundary and `loadKnowledgePlan()` is the lazy-loading boundary. In portable environments, reproduce the boundary with available metadata; do not require Ornn's Node or Python tooling.

## Questions to Ask

- What outcome does the original request seek, independent of Ornn terminology?
- Which signals came from the user, project context, explicit selectors, or pins?
- Was every required signal observed rather than guessed?
- Does each selected artifact add distinct decision value?
- Are exclusions and negated context honored after merging explicit and ranked selections?
- Can the lowest-value artifact be removed without losing needed coverage?
- Is external research justified, and if so should `research-router` guide source choice?
- Does the plan remain executable by a consuming agent without an Ornn runtime?

## Attack Patterns

- **Repeat:** normalize and plan the same request twice; equivalent inputs should produce equivalent selections.
- **Negate:** add “no external research,” “no permissions,” or explicit pin exclusions and confirm they suppress rather than strengthen signals.
- **Override:** combine shortcut, command, include, and exclude pins; verify deterministic precedence and no duplicate skills.
- **Ambiguate:** use broad terms such as “state,” “access,” or “review” and reject keyword-only skill explosion.
- **Remove:** delete the lowest marginal selection and test whether any required lens disappears.
- **Relocate:** run from a project with no context files or optional tooling; discovery should degrade explicitly and remain portable.
- **Separate:** ensure the gateway never executes shell commands, applies fixes, assigns confidence, or turns hypotheses into findings.

## Evidence Requirements

A gateway plan is supported when its output can be traced to the preserved request, detected project signals, catalog entries, explicit selectors, exclusions, router result, and actual loaded paths. Debug mode should expose candidates, scores, budget, and rejection reasons available from the implementation. Do not claim deterministic equivalence when using a manual fallback, and do not claim an artifact was loaded without reading it. Routing evidence establishes relevance only; it never establishes a downstream finding.

## False Positives

- A broad category match alone does not justify loading every related skill.
- `composes_with` is a relevance hint, not a dependency edge.
- A related recipe, collection, pattern, or reference is not automatically required.
- Project context is a bounded signal source, not global memory or permission to widen the task.
- Explicit selection may intentionally exceed an automatic budget; report it instead of silently discarding user intent.
- Failure of optional deterministic tooling does not make specialist knowledge unusable; use a disclosed metadata-only fallback.
- Do not expose internal telemetry by default or require users to know internal skill names.
- Do not confuse planning and loading knowledge with executing the requested work.

## Output Format

Internally produce a Knowledge Plan equivalent to:

```yaml
intent:
  task: "<original request>"
  normalized: "<routing text>"
  shortcut: "<resolved shortcut or null>"
  category: "<dominant category>"
  risk: "<risk>"
knowledge:
  primary: ["<skill id>"]
  supporting: ["<skill id>"]
  recipes: ["<related recipe id>"]
  collections: ["<related collection id>"]
  patterns: ["<related pattern id>"]
  references: ["<reference catalog>"]
strategy:
  load: ["<typed artifact id>"]
  avoid: ["<excluded skill>"]
project:
  files: ["<context file read>"]
  signals: ["<detected signal>"]
execution: consuming-agent
```

The exact serialized shape may vary outside the repository implementation. Usually do not show the plan; use it to load a compact context, state material limitations, and let the consuming agent perform the original request.
