# Security Policy

## Reporting a vulnerability

The project has two attack surfaces worth reporting:

1. **The installer/CLI** — filesystem operations (`install`, `--force`,
   `--dry-run`, `doctor`). Bugs here can remove or corrupt user files.
2. **Skills content** — a skill that teaches unsafe behavior, introduces
   untrusted instructions, or could mislead an agent into dangerous actions.

Please report privately. Do **not** open a public issue for a security
vulnerability. Use the GitHub security advisory flow
(<https://github.com/1arley/1arley-agent-skills/security/advisories/new>) or email
the maintainers privately.

## What counts as a security issue

- Path traversal or symlink-following in the installer.
- `--force` deleting paths outside the intended skill directory, the target, the
  filesystem root, or the home directory.
- Arbitrary command execution through skill content or references.
- Skills that instruct an agent to perform destructive or unethical actions.
- Secrets or credentials committed to the repository.
- Reference content that could enable supply-chain attacks.

## Reporting expectations

- A description of the vulnerability and how to reproduce it.
- The affected version(s).
- Proposed remediation if you have one.

The maintainers will acknowledge within 7 days and work toward a fix. Security fixes
are released as fast as possible and are described in `CHANGELOG.md` under the
`Security` section.

## Scope

The repository is a collection of markdown skills, a Python validator/eval harness,
and a Node CLI. Python and Node dependencies are intentionally zero at runtime; keep
it that way. Third-party code in `references/` is cataloged with authority levels and
lifecycle status and must never be treated as trusted input.
