---
name: react-doctor-audit
description: Uses React Doctor to surface React, Next.js, and React Native code risks, then verifies each diagnostic against runtime behavior and project invariants before reporting it.
license: MIT
metadata:
    aes-category: frontend
    aes-priority: medium
---

# React Doctor Audit

## Objective

Turn React Doctor diagnostics into evidence-backed findings by proving the mechanism and impact of each candidate rather than treating scanner output as a bug list.

## When to Use

Use for an explicit React Doctor scan or a React-family code audit covering state and effects, performance, architecture, accessibility, security, or maintainability. Confirm that the target stack is supported before running the tool. Do not activate for non-React projects, generic UI critique, or requests that prohibit installing or executing package tools.

This skill owns scanner-assisted React code analysis. Specialized frontend reviews verify user-facing consequences; security findings require the relevant security skill when deeper threat analysis is needed.

## Mental Model

React Doctor is a hypothesis generator:

```text
diagnostic → exact code path → reachable behavior → violated invariant → observed impact
```

A clean scan does not prove correctness, and a diagnostic does not prove a defect. Project configuration, generated code, framework conventions, and deliberate trade-offs determine applicability.

## Investigation Procedure

1. Inspect package manifests, framework/version, source roots, workspace layout, generated directories, React Doctor configuration, and available scripts.
2. Record tool version and invocation. Prefer the project's pinned version; if none exists, disclose any ephemeral execution or network dependency before interpreting results.
3. Scope the scan to canonical source and exclude dependencies, builds, fixtures, vendored, and generated output.
4. Capture machine-readable output when supported and preserve the unmodified diagnostic, rule ID, severity, and location.
5. Group diagnostics by rule and likely root cause. Inspect the exact code, callers, data flow, lifecycle, and framework behavior.
6. Determine reachability and the violated project invariant. Reproduce runtime or test impact where practical.
7. For a proposed fix, predict state, render, hydration, effect, and cleanup changes. Apply fixes only when authorized and verify with focused tests plus a rescan.
8. Reclassify or discard false positives. Consolidate multiple diagnostics caused by one mechanism.
9. Hand user-facing accessibility, interaction, or visual effects to the corresponding review without duplicating the finding.

## Questions to Ask

- Is the scanned file canonical, reachable source in the shipped target?
- Does the rule apply to this React and framework version?
- What exact render, effect, state, hydration, security, or maintenance invariant fails?
- Can the pattern create stale state, repeated work, unstable identity, remounting, or unsafe output here?
- Is the diagnostic intentional and documented, or suppressed by project configuration?
- Would the suggested fix preserve behavior and improve the invariant?
- Are multiple warnings symptoms of one component or data-flow problem?
- What remains untested when the scanner is unavailable or incomplete?

## Attack Patterns

- **Repeat:** run the same pinned command twice; distinguish source changes from nondeterministic output.
- **Scope:** include and exclude suspected generated or vendored paths to detect scan pollution.
- **Trace:** follow a diagnostic through callers and runtime state instead of stopping at its line.
- **Reverse:** apply the smallest authorized fix, rerun focused tests and scan, then compare behavior.
- **Manipulate:** exercise reorder, remount, hydration, rapid updates, unmount, and hostile input when relevant.
- **Version:** compare the rule documentation with the installed framework and tool versions.

## Evidence Requirements

A `CONFIRMED` finding requires a reproduced diagnostic, exact location, reachable mechanism, violated invariant, and direct test or runtime result. `HIGH CONFIDENCE` requires the diagnostic plus concrete structural evidence and exact mechanism. Scanner output without contextual verification is `POSSIBLE`. Do not report `SPECULATIVE` warnings as bugs. Record tool/version, command, scope, rule ID, source location, relevant code, and verification result.

## False Positives

- Array-index keys can be acceptable for truly static, never-reordered lists.
- A large component can be an intentional boundary; line count alone does not prove harm.
- Effects may correctly synchronize with external systems; not every effect should become derived state.
- Framework-generated, vendored, test, and build output should not become product findings.
- A documented trade-off or project suppression may be valid, but verify its current assumptions.
- A warning disappearing after a rewrite does not prove the rewrite preserved behavior.
- Scanner silence does not establish performance, accessibility, or security.

## Output Format

Use `templates/audit-report.md`. Add tool and version, command and scope, rule ID, location, category, relevant code path, invariant, mechanism, runtime or test evidence, impact, minimal fix, rescan result when applicable, provenance, and false-positive check. Group by root cause rather than warning count and separately list discarded diagnostics with concise reasons. Clearly state when the tool could not run or coverage was partial.
