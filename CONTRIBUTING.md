# Contributing

Thanks for contributing to Ornn's portable knowledge library.

## Before opening a PR

Read `docs/contributing-skills.md` before proposing a new skill. The short version:
a new skill must demonstrate a real gap (failing eval), incompatible
responsibilities, or a measurable improvement. Quantity of skills is not a quality
metric.

## Development loop

```bash
python3 scripts/validate.py                  # repo contracts
python3 -m unittest discover -s test -p 'test_*.py'   # findings tests
node --test test/cli.test.js                 # CLI tests
python3 scripts/eval.py route --router v2 --check      # routing gates
python3 scripts/eval.py findings-fixtures    # dedup/confidence fixtures
npm pack --dry-run                           # package sanity
```

## Guidelines

- **Do not add skills just for coverage.** Prefer improving evals, routing,
  metadata, composition, dedup, knowledge, tooling, interoperability, CI, security,
  or documentation.
- **Keep skills focused and portable.** Shared reusable concepts belong in
  `knowledge/`, not repeated in every `SKILL.md`.
- **Do not turn composition into execution.** Recipes recommend skill sets; the
  consuming agent owns workflow and implementation.
- **Preserve the portable frontmatter.** No proprietary top-level fields.
  Routing lists live in `catalog/skills.yaml`.
- **Zero runtime dependencies.** Use native APIs; do not add npm dependencies.
- **Prove changes with evals.** A behavioral change needs an eval case update and
  must not regress other domains.
- **No silent destructive behavior.** Guardrails on filesystem operations are
  mandatory; `--force` must never delete outside the intended target.
- **No invented numbers.** Benchmark results come from reproducible runs with
  provider, model, version, prompts, run count, date, and cost recorded.

## Pull request checklist

- [ ] `python3 scripts/validate.py` passes
- [ ] `python3 scripts/eval.py route --router v2 --check` passes
- [ ] `node --test test/cli.test.js` passes
- [ ] `python3 -m unittest discover -s test -p 'test_*.py'` passes
- [ ] `npm pack --dry-run` is clean
- [ ] catalog updated when skills/metadata change
- [ ] eval cases added/updated for behavioral changes
- [ ] docs updated (`docs/architecture.md`, `docs/routing.md`, `docs/evals.md`)
- [ ] `CHANGELOG.md` updated
- [ ] no unexplained regression

## Commits

Prefer small, semantic commits:

```text
feat(catalog): add structured skill metadata
test(router): add routing evaluation suite
fix(cli): guard force removal paths
ci: add validation and CLI test workflow
docs: document evaluation architecture
```

## Releases

Releases follow `docs/release-process.md`. Do not push tags, publish to npm, or
create releases without maintainer authorization.
