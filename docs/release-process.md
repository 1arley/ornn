# Release Process

## Versioning

Semantic Versioning for the package (`MAJOR.MINOR.PATCH`).

- **Patch**: bug fixes, doc updates, no contract change.
- **Minor**: new skills, new evals, catalog changes that add metadata, CLI
  additions, backward-compatible features.
- **Major**: breaking contract changes (frontmatter shape, CLI behavior,
  catalog schema, installed layout).

Skills carry their own lifecycle in the catalog (`experimental`, `stable`,
`deprecated`). A skill becoming `stable` is a minor change.

## Release gate

A release requires all of the following to pass on the tag:

```bash
python3 scripts/validate.py
node --test test/cli.test.js
python3 -m unittest discover -s test -p 'test_*.py'
python3 scripts/eval.py route --router v2 --check
python3 scripts/eval.py findings-fixtures
npm pack --dry-run
```

CI enforces these in `.github/workflows/release.yml`, including checking that the
package version matches the tag.

## Steps

1. Update `package.json` version and `CHANGELOG.md` (Added / Changed / Fixed /
   Deprecated / Removed / Security).
2. Run the release gate locally.
3. Push a `vX.Y.Z` tag.
4. `.github/workflows/release.yml` runs the gate. If it fails, fix and re-tag.
5. Publish to npm (requires maintainer credentials; do not publish without explicit
   authorization).
6. Create a GitHub Release from the tag, attaching the benchmark summary if a new
   benchmark was produced.
7. Save `evals/results/vX.Y.Z.json` when metrics changed and record the diff.

## Regression tracking

Every release must answer: did the agent get objectively better, worse, or the same?
Record routing precision, recall, critical recall, duplicate rate, unsupported
confirmation rate, and average selected skills. Never publish numbers that were not
reproduced.

## Automation boundaries

- The release workflow validates; it does not publish npm automatically.
- Publishing requires maintainer authorization.
- Do not push tags, publish releases, or modify remote infrastructure without
  explicit permission.