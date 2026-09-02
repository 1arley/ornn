# Commands

`/ornn <natural-language request>` is the primary discovery surface. Intent commands
in `commands/` such as design, audit, research, accessibility and security remain
shortcuts. They strengthen intent and point to skills, recipes and collections, then
pass through the same Gateway pipeline; they are not a parallel router.

`ornn show design` explains a shortcut and `ornn discover "security review" --debug`
previews selection. Neither command runs an agent.
