---
name: ux-review
description: Evaluates whether an interface helps its intended users understand, complete, and recover from tasks through clear information architecture, feedback, navigation, and state handling.
license: MIT
metadata:
    aes-category: frontend
    aes-priority: medium
---

# UX Review

## Objective

Determine where an interface creates evidenced friction between a user's intent and successful task completion.

## When to Use

Use for usability reviews of screens or flows, especially unclear navigation, terminology, prioritization, forms, empty states, errors, onboarding, or progress. Do not activate for purely visual polish, code quality, or server-side correctness.

This skill owns task comprehension and flow-level usability. `visual-quality-review` owns craft, `interaction-design` owns local control states, and `user-flow-audit` owns cross-system transition correctness. Use research evidence when impact or audience assumptions are uncertain.

## Mental Model

Review the complete task loop:

```text
goal → find entry → understand choices → act → interpret feedback → recover or continue
```

Clarity and efficiency are contextual. Expert tools may be dense; safety-critical actions may be deliberately slow. Evaluate against users, frequency, consequence, and product intent rather than universal simplicity.

## Investigation Procedure

1. Establish target users, their goals, frequency, platform, success criteria, and constraints from product context. State unresolved assumptions.
2. Select critical and failure-prone tasks rather than reviewing isolated screenshots only.
3. Walk each task from entry through completion and recovery, recording decisions, hidden prerequisites, context switches, and dead ends.
4. Evaluate terminology, hierarchy, information scent, affordance, cognitive load, and whether the primary next action is discoverable.
5. Exercise empty, first-use, loading, partial, error, permission, offline, success, and returning-user states.
6. Test back, cancel, retry, undo, refresh, and resumed work. Verify that feedback explains outcome and next action.
7. Compare equivalent patterns across the product and applicable platform conventions.
8. Separate observed interface facts from inferred user impact. Seek usability data or testing when the claim depends on behavior not directly observable.
9. Consolidate candidates by root cause and recommend the smallest change that improves the task without harming other users.

## Questions to Ask

- Who is the user, what are they trying to finish, and how is success measured?
- Can they find the entry and predict the result of the next action?
- Which information must be remembered, inferred, or obtained elsewhere?
- Does terminology match the user's domain and remain consistent?
- Is the primary action clear without hiding valid alternatives?
- Do loading, empty, error, and success states explain status and next steps?
- Can users safely cancel, retry, undo, or resume?
- Is friction accidental, or justified by safety, learning, or expert efficiency?
- What evidence supports the claimed impact?

## Attack Patterns

- **Skip:** enter through a deep link, notification, or empty state without onboarding.
- **Reverse:** back out, cancel, undo, and resume midway.
- **Repeat:** submit, retry, or revisit; look for ambiguity and lost context.
- **Reorder:** complete optional steps first or arrive with partial data.
- **Interrupt:** refresh, go offline, change viewport, or leave and return.
- **Role swap:** test first-time, expert, low-permission, and no-data contexts where supported.

## Evidence Requirements

A `CONFIRMED` finding requires observed task behavior or deterministic interface behavior, a reproducible flow, exact screen/component, violated task invariant, mechanism, and impact. `HIGH CONFIDENCE` uses concrete structural evidence with a clear mechanism. Use `POSSIBLE` when user impact depends on untested audience assumptions. Heuristics and competitor patterns support reasoning but do not prove harm. Never present personal preference as a finding.

## False Positives

- High density may improve expert workflows.
- Additional friction may protect destructive, financial, legal, or privacy-sensitive actions.
- An empty state may correctly be informational when no action is available.
- Audio or haptic feedback can supplement visuals, but verify platform and user context.
- Platform-specific navigation may differ while remaining familiar to its audience.
- A design-system inconsistency is not automatically a usability failure.
- Missing features and business-policy disagreements are not UX defects unless the interface misrepresents them.

## Output Format

Use `templates/audit-report.md`. Include user/task, entry conditions, affected flow, invariant, reproduction, expected and actual experience, mechanism, evidence for impact, recommendation, provenance, evidence records, assumptions, and false-positive check. Prioritize inability to complete or recover, consequential mistakes, and navigation loss before efficiency and clarity issues. Separate verified findings from research questions.
