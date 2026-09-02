# Getting started

Install the CLI, inspect recommendations, then install only the knowledge you want:

```bash
npm install -g ornn-forge
ornn init
ornn search frontend
ornn show frontend/design-library-research
ornn install frontend-craft --providers claude,codex --scope project
```

`init` detects providers and common frontend stacks. Suggestions are advisory and it
does not create an autonomous session. Use `--yes` to apply detected recommendations.

