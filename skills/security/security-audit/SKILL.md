---
name: security-audit
description: Stack-adaptive codebase security audit. Detects the project's language, framework, ORM, auth mechanism, frontend and deploy files first, then sweeps five verified failure classes (missing tenant/owner isolation, browser-side privilege gates, IDOR, hardcoded secrets, unhandled input/XSS) and produces evidence-backed findings, a strengths section, prioritized recommendations and a ready report with GitHub issues.
license: MIT
metadata:
    aes-category: security
    aes-priority: high
---

# Security Audit

## Objective

Perform a stack-adaptive, evidence-driven codebase security audit across five baseline failure classes: tenant/owner isolation, browser-only privilege gates, IDOR, exposed secrets, and unsafe HTML/input sinks. Measure coverage and report only verified findings.

## When to Use

Use for a broad security review of a repository or service, especially before deployment or when it handles multiple users or tenants. Do not invoke the full sweep for a request limited to one known class; use `authorization-audit`, `input-trust-audit`, `api-abuse-audit`, or `data-integrity-audit` directly.

This is an umbrella and consolidation skill. Specialists deepen candidates; `adversarial-review` probes bypass and repetition; `error-flow-audit` covers partial failures. Do not duplicate a root cause across categories or specialist outputs.

## Mental Model

Run a translation-and-verification pipeline:

```text
detect stack → map invariants to stack controls → enumerate coverage → verify candidates → consolidate
```

The five classes are invariants, not search strings. Translate isolation into the project's actual RLS, scoped repository, middleware, or query model. Treat frontend gates as pointers to privileged server operations, never as controls. Coverage must distinguish “checked and protected” from “not inspected.” A public key is not a secret; classify exposure by capability and deployment context.

## Investigation Procedure

1. Detect language, framework, routing, ORM/query layer, authentication, frontend/rendering, deployment, background jobs, and trust boundaries from manifests and code.
2. Bound scope and create inventories of routes/operations, protected resources/tables, frontend privilege gates, configuration/deploy files, and unsafe rendering sinks. Declare explicit N/A categories.
3. **Isolation:** identify the authoritative tenant/owner mechanism and inspect every relevant read/write, emphasizing list, aggregate, search, report, and export paths.
4. **Browser-only gates:** map every frontend role/permission gate to its server operation and verify server-side enforcement.
5. **IDOR:** inspect every operation accepting an owned-resource identifier, including nested, batch, preview, attachment, and alternate-version paths.
6. **Secrets:** scan source, configuration, deployment, CI, artifacts, and—when authorized and proportionate—git history. Determine whether each value is real, privileged, deployed, and rotated. Check unsafe production defaults and startup validation.
7. **Unsafe input/HTML:** enumerate raw HTML/markdown/template/URL/code sinks and trace user-controlled data plus contextual escaping, sanitization, or scheme allowlists.
8. Reproduce candidates safely or trace the exact reachable mechanism. Record exploitability conditions and compensating controls.
9. Consolidate shared causes, recalculate confidence from all evidence, record strengths and coverage gaps, and prioritize remediation.

## Questions to Ask

* What stack-specific mechanism enforces tenant and owner isolation?
* Do all list, aggregate, report, search, export, and background paths apply it?
* Which server operation corresponds to each browser privilege gate?
* Does every resource ID resolve within the caller's authorized scope?
* Are alternate verbs, nested resources, files, batch operations, and versions protected equally?
* Is an exposed value secret, publishable, placeholder, invalid, or already rotated—and what capability does it grant?
* Can deployment fall back to a known secret without failing startup?
* Which user-controlled values reach raw HTML, markdown, URL, template, or code sinks, and what context-aware control applies?
* What was verified as protected, and what remains uninspected?

## Attack Patterns

```text
isolation:      omit tenant predicate from aggregate/export/background query
browser gate:   hide admin action in UI → invoke server endpoint as ordinary user
IDOR:           replace owned ID with another actor's across verbs and subresources
secret default: deploy without env → known repository default signs/authenticates
history secret: removed credential remains valid because it was never rotated
stored XSS:     user HTML/markdown reaches raw rendering without sanitization
URL injection:  javascript: or unsafe scheme reaches user-controlled href/src
control parity: primary route protected; batch/preview/legacy route omitted
```

## Evidence Requirements

Every finding needs exact file/line provenance, reachable data/control flow, violated invariant, exploitability conditions, impact, and either observed reproduction or concrete structural evidence. IDOR ideally uses two actors. Secret findings must prove a real capability or unsafe deployed default, not pattern resemblance. XSS findings must trace controllable input to an executable sink without effective contextual protection.

Use `CONFIRMED`, `HIGH CONFIDENCE`, `POSSIBLE`, and `SPECULATIVE` exactly as defined in `AGENTS.md`. Keep speculative risks separate and never block release on them. When inventories are incomplete, label coverage partial.

## False Positives

Verify inherited middleware, database policies, scoped repositories, public-resource intent, framework auto-escaping, write-time sanitization, URL allowlists, and deployment/gateway controls. Publishable keys, OAuth client IDs, placeholders, fixtures, and secret references are not exposed secrets by themselves. A raw sink is not exploitable without attacker control and missing effective sanitization. N/A is valid for an inapplicable category; absence of a local check is not absence of an effective shared control.

## Output Format

Use `templates/audit-report.md` for each consolidated finding, including `affected_component`, `invariant`, `mechanism`, `state_transition`, impact, severity, confidence, and `evidence[]` with file/line sources. Group by the five classes and order by severity, with isolation and IDOR first when severity ties.

The final report must include stack/scope methodology, executive summary, evidence-backed strengths, findings table, coverage inventories and gaps, prioritized P1/P2/P3 recommendations, and tracker-ready issues with acceptance criteria. Group trivial findings sharing one cause. When multiple skills contribute, run `scripts/findings.py` for deduplication and confidence recalculation.
