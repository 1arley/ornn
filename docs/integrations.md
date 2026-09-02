# Integrations

Provider adapters translate canonical skill frontmatter or placement only. The build
pipeline reads `integrations/<provider>/integration.json` and generates `dist/`.
Generic, Claude, OpenCode, Codex and Cursor are supported; identity adapters preserve
the Agent Skills format where no transformation is required.

