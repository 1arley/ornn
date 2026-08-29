# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/) — Added, Changed, Fixed,
Deprecated, Removed, Security.

## [Unreleased]

### Added

- `security-audit` skill: stack-adaptive codebase security audit covering five
  verified failure classes (tenant/owner isolation, browser-side privilege gates,
  IDOR, hardcoded secrets, unhandled input/XSS) with file:line evidence, a
  strengths/coverage section, prioritized recommendations, and a final report
  with ready-to-file tracker issues. Cataloged as `security / generator /
  experimental` with a routing eval case.

- Universal interactive installer with agent detection and provider selection
  (`npx ornn-forge install`).
- Provider registry with Claude Code, Codex, OpenCode, Cursor, and Gemini CLI
  adapters; universal `.agents/skills` mode.
- `--scope project|global`, `--providers`, `--universal`, `--yes`, `--dry-run`,
  and short aliases `-g`, `-y`, `-a`.
- Installation manifest (`.ornn-forge.json`) recording managed
  providers and skills.
- `update` and `uninstall` commands driven by the manifest; only managed files
  are touched.
- `list` and `doctor` now report installations per provider.
- Non-interactive (CI) mode: no TTY means no prompts; insufficient flags yield
  an actionable error.
- 24 installer tests (provider detection, scope, adapters, manifest, update,
  uninstall, dry-run, force, path safety).
- `src/installer/` modular architecture (providers, detect, install, prompts,
  paths, manifest, orchestrator).

- Structured skill catalog (`catalog/skills.yaml`) as single source of truth
  for triggers, roles, risk floors, composition, overlap, and cost.
- Frontmatter migration to portable Agent Skills format
  (`metadata: {aes-*}` namespace).
- Deterministic router v2 with catalog-driven scoring, skill budget, overlap
  penalty, risk floor, and near-miss reporting.
- Router v1 frozen baseline for reproducible before/after comparison.
- 49 eval cases: 19 routing + 30 behavioral, positive and negative, across
  all domains.
- Eval harness with routing precision, recall, critical recall, over-routing,
  and skill-budget metrics; configurable gates.
- Finding consolidation with semantic identity, transitive dedup, evidence
  merging, provenance preservation, and evidence-based confidence.
- Confidence recalibrated from mechanism + evidence; never inherits
  max-claimed skill vote.
- 14 deterministic unit tests for finding identity, dedup, and confidence.
- End-to-end findings fixtures with output stability checks.
- CLI hardening: `--dry-run`, `--force` guardrails (root, home, target, path
  traversal), `doctor`, `list`, `graph`, `eval` commands.
- 16 CLI tests with `node:test`.
- GitHub Actions CI workflow (node 18/20/22, Python 3.11, routing gates,
  findings fixtures, CLI tests, npm pack, graph smoke).
- Reference lifecycle workflow (weekly schedule, offline schema + optional
  online health checks).
- Release gate workflow (validator, evals, tests, pack, version-tag check).
- Reference lifecycle: `last_verified`, `status`, freshness monitoring,
  duplicate-URL detection.
- 19 knowledge documents across engineering, security, product, research,
  and frontend, with progressive-disclosure pointers from 9 skills.
- Architecture, routing, evals, compatibility, contributing-skills, and
  release-process documentation.
- Auto-generated composition graph from catalog.
- `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODEOWNERS`.
- `check_references.py` for offline lifecycle and URL duplicate detection.
- `npm pack --dry-run` in CI.
- `.npmignore` to exclude CI-only artifacts and scratch files.

### Changed

- `plan.md` reset to 10/10 post-v1 roadmap.
- Validator now checks catalog drift, eval-case contracts, finding fixture
  stability, and reference lifecycle.
- `AGENTS.md` evidence rules updated to match the executable confidence
  contract.
- `templates/audit-report.md` and `templates/bug-report.md` updated with
  provenance, evidence records, and dedup guidance.
- Package.json updated with test scripts, keywords, and expanded whitelist.

### Fixed

- `install --link` no longer crashes with ENOENT on a fresh target: the parent
  directory is created before each symlink is written.
- Refused skill installations (path-safety rejections) now surface as a
  non-zero exit code and an explicit error, instead of a silent "0 skills"
  success.
- `install --force` now correctly overwrites existing skill directories.
- `--force` destinations are guarded against filesystem root, home, outside
  target, and target-equivalent paths.
- Minimal YAML parser handles nested mappings and reference-catalog shapes.
- Negative-context words (`no`, `not`, `without`) no longer activate domain
  classification.

### Security

- Fixed symlink-escape (CWE-59) in project-scope installs: a malicious repo
  could commit `.claude`/`.agents`/etc. as a symlink to an attacker-chosen
  directory (e.g. the user's real `~/.claude`), and the purely lexical
  `startsWith` check in `safeDestFor` passed while every write landed *outside*
  the project. `safeDestFor` now takes an `anchor` (the project root) and
  resolves the real path of every existing ancestor via `realpath`; any
  destination whose real location escapes the anchor is refused. Applies to
  install, plan, and uninstall. Global scope is intentionally unanchored (the
  repo cannot plant symlinks in the user's home, and a symlinked `~/.claude`
  is a legitimate dotfiles pattern).
- Filesystem guardrails for `install --force`: absolute path resolution,
  root/home/target/outside-target rejection.
- Installer uses `safeDestFor` validation before every removal.