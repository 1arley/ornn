# Agent integration

Integrations are distribution adapters, not agent runtimes. Each descriptor in
`integrations/<provider>/integration.json` declares a format and adapter. `ornn build`
transforms the one canonical `skills/` source into provider output, and `ornn install`
places selected skills in documented provider locations.

The consuming agent discovers and applies skills according to its own execution model.
Generic `SKILL.md` directories remain usable without the CLI.
