# Changelog

## Unreleased — portable knowledge architecture

### Added

- Canonical patterns, recipes, collections, intent commands and version catalog.
- Generic, Claude, OpenCode, Codex and Cursor source-to-dist builds.
- Cross-type `list`, `search`, `show`, collection-aware install, `init`, `build`,
  `pin` and deterministic `detect` CLI capabilities.
- Optional `PRODUCT.md` and `DESIGN.md` project-context conventions.
- Deterministic frontend detectors and cross-layer validators.

### Changed

- Ornn is defined as a portable skill/knowledge library; execution belongs to the
  consuming agent.
- Skill and research routers are optional selection methodologies.
- Provider installation remains compatible while collections constrain managed
  skill sets and updates preserve the original selection.
- Frontend references, including Eldora UI and Pace UI, were reverified.

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/) — Added, Changed, Fixed,
Deprecated, Removed, Security.

## [1.0.2] - 2026-08-30

### Fixed

- Interactive installer (`npx ornn-forge install`) is now actually interactive.
  The previous TUI mixed `readline.createInterface` with a manual raw-mode
  `data` listener, which made readline echo stray characters into the UI,
  ignored arrow keys in tmux/screen/application-cursor terminals
  (`\x1bOA`/`\x1bOB`), left the process hung in raw mode after Ctrl+C, and
  full-cleared the terminal (`\x1b[2J`) on every keystroke. Prompts now use
  `readline.emitKeypressEvents` with a single keypress listener, redraw only
  the prompt region, handle Ctrl+C / Esc / `q` as cancel (restoring the
  terminal), and the scope step is a real arrow-key radio selection matching
  the README instead of a plain text prompt. Ctrl+D (EOF) no longer leaves
  `promptLine`/`promptConfirm` pending. 26 unit tests added
  (`test/prompts.test.js`).

## [Unreleased]

### Added

- `security-audit` skill: stack-adaptive codebase security audit covering five
  verified failure classes (tenant/owner isolation, browser-side privilege gates,
  IDOR, hardcoded secrets, unhandled input/XSS) with file:line evidence, a
  strengths/coverage section, prioritized recommendations, and a final report
  with ready-to-file tracker issues. Cataloged as `security / generator /
  experimental` with a routing eval case.

- Universal interactive installer with agent detection and destination
  selection (`npx ornn-forge install`).
- Data-driven destination profiles in `catalog/providers.json` (Claude Code,
  Codex, OpenCode, Cursor, Gemini CLI); adding an agent is a catalog entry, not
  a code change.
- Isolated adapters in `src/installer/adapters/` (`identity`, `claude`),
  referenced by name from the catalog with validation against unknown adapters.
- Interactive flow shows evidence per destination (`configured` / `command
  found` / `not detected`); Universal `.agents/skills` and a Custom directory
  option are always available.
- `--scope project|global`, `--providers`, `--universal`, `--destination`,
  `--yes`, `--dry-run`, and short aliases `-g`, `-y`, `-a`.
- Installation manifest v2 (`.ornn-forge.json`) recording explicit
  destinations (`id`, `type`, `target`, `adapter`, `skills`); `update` and
  `uninstall` operate on recorded targets without recomputing paths.
- Backward-compatible upgrade of v1 manifests (providers array) on update.
- `list` and `doctor` now report installations per provider; doctor derives the
  expected skill count from the source instead of a hardcoded number.
- Non-interactive (CI) mode: no TTY means no prompts; insufficient flags yield
  an actionable error.
- Installer tests covering data-driven catalog, custom destinations (inside and
  outside the project), v1→v2 manifest upgrade, evidence, and path safety.
- `src/installer/` modular architecture (providers, adapters, install, prompts,
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
