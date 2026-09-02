# Universal installer compatibility

The historical universal installer is now Ornn's provider adaptation layer. It copies
canonical `SKILL.md` directories, applies only documented provider transformations and
records managed destinations. It does not route tasks, run skills or own agent state.

Existing `ornn-forge` commands and manifest v1/v2 reads remain supported. New usage is
documented in `README.md` and `docs/integrations.md`.
