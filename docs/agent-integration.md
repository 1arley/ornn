# Agent integration

Integrations are distribution adapters, not agent runtimes. Each descriptor in
`integrations/<provider>/integration.json` declares a format and adapter. `ornn build`
transforms the one canonical `skills/` source into provider output, and `ornn install`
places selected skills in documented provider locations.

The consuming agent discovers and applies skills according to its own execution model.
Generic `SKILL.md` directories remain usable without the CLI.

Every distribution includes the canonical `ornn` Gateway skill, exposed as `/ornn`
where the provider supports slash invocation. Provider adapters may change compatible
frontmatter, but never maintain a separate Gateway copy. The Gateway reads metadata,
builds a Knowledge Plan, then lazily reads selected artifacts; it does not invoke
tools or execute the user's task.
