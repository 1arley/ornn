# Project context

Consumer projects may define `PRODUCT.md` with audience, purpose, operating context,
constraints, voice, domain and durable facts. They may define `DESIGN.md` with visual
direction, typography, colors, spacing, components, motion, interaction language,
tokens, decisions and rejected patterns.

When present, these files are project contracts. Skills should adapt generic knowledge
to them. When absent, agents inspect the project and state assumptions. Ornn never
copies their content into its global library.

The Gateway also recognizes an optional, project-local discovery layer:

```text
.ornn/
├── context.md
├── project.md
├── preferences.md
└── pins.yaml
```

All files are optional. Markdown contributes project signals; it is not canonical
knowledge. Pins are declarative shortcuts over the normal routing pipeline:

```yaml
pins:
  secure:
    include:
      - security
      - recipe:security/api-audit
    exclude:
      - frontend/animation-review
```

Invoking `/ornn secure` normalizes this pin and continues through the same selection,
overlap and lazy-loading stages. Pins do not execute skills or commands.
