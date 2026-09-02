# Getting started

Install Ornn for your agent:

```bash
npm install -g ornn-forge
ornn init
ornn install --providers claude,codex --scope project
```

Use one public entry point inside the agent. No router or skill name is required:

```text
/ornn analyze this PR
/ornn improve the architecture of this backend
/ornn investigate this bug
```

Maintainers can inspect a plan without loading or executing its content with
`ornn discover "<request>" --debug`. `ornn search`, `show` and selective installs
remain advanced discovery and compatibility tools.

`init` detects providers and common frontend stacks. Suggestions are advisory and it
does not create an autonomous session. Use `--yes` to apply detected recommendations.
The Gateway also only discovers knowledge; the consuming agent executes the request.
