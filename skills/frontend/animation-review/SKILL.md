---
name: animation-review
description: Evaluates implemented interface motion for purpose, timing, continuity, interruption, performance, and reduced-motion behavior without treating animation as decoration by default.
license: MIT
metadata:
    aes-category: frontend
    aes-priority: medium
---

# Animation Review

## Objective

Verify that implemented motion communicates change, preserves spatial and causal continuity, remains responsive under interruption, and avoids accessibility or performance harm.

## When to Use

Use when reviewing implemented transitions, gestures, route changes, entrances and exits, loaders, scroll-linked effects, parallax, or micro-animations, or when users report motion that feels slow, confusing, jarring, or uncomfortable. Do not activate merely because a UI has ordinary instantaneous state changes.

This skill owns temporal behavior. `interaction-design` owns control-state completeness, `accessibility-review` owns equivalent access, and `design-library-research` owns pre-implementation sourcing. Consolidate findings that share one mechanism.

## Mental Model

Motion is a state transition made visible:

```text
before state → trigger → trajectory and timing → settled state → interruption path
```

Judge motion relative to the task and causal model. Timing presets are not universal evidence. Often the best animation is the least motion that makes change understandable.

## Investigation Procedure

1. Establish product context, supported devices, performance constraints, design tokens, and critical flows.
2. Inventory motion by trigger and state pair: hover, press, expand, navigation, reorder, progress, scroll, drag, entrance, and exit.
3. State the user-relevant purpose of each animation; test removal when no purpose is evident.
4. Record duration, delay, easing, distance, scale, sequencing, and animated properties. Compare semantically equivalent transitions.
5. Verify origin, destination, direction, hierarchy, and object permanence against the underlying state change.
6. Interrupt and reverse repeatedly. Rapid input must converge on the latest state without queues, stale callbacks, flashes, or blocked controls.
7. Test throttling, background/resume, route changes, and content resizing for dropped frames, layout thrashing, and orphaned animations.
8. Enable reduced motion and project controls. Replace high-risk spatial effects while preserving essential feedback.
9. Reproduce candidates and distinguish motion defects from underlying interaction, loading, or state-consistency defects.

## Questions to Ask

- What change does the animation explain, and is that information otherwise clear?
- Do direction, origin, destination, and sequence match causality?
- Can users act during motion, and does repeated input settle at their latest intent?
- Are timings proportional to distance, frequency, complexity, and urgency?
- Does competing motion obscure hierarchy?
- Are animated properties performant on the supported device floor?
- Does reduced motion remove vestibular risk without hiding feedback?
- Is motion the cause, or merely the visible symptom of another defect?

## Attack Patterns

- **Repeat:** trigger rapidly and look for queues, duplicate callbacks, or delayed final state.
- **Reverse:** toggle before completion; motion should retarget from its current state.
- **Reorder:** change content or route while entrance and exit overlap.
- **Skip:** disable motion or jump to the end; essential information must remain.
- **Interrupt:** scroll, resize, navigate, background, or reduce motion mid-animation.
- **Degrade:** throttle CPU and vary content height, viewport, and refresh conditions.

## Evidence Requirements

A `CONFIRMED` finding needs a reproducible trigger sequence, before/after state, observed temporal defect, exact component or source, and mechanism. Include timing, frame trace, animated property, or reduced-motion results when relevant. `HIGH CONFIDENCE` may use exact structural evidence when runtime reproduction is unavailable. Use `POSSIBLE` for subjective pacing or unverified discomfort. Generic timing guidance and reference animations are rationale, not evidence.

## False Positives

- Linear easing can suit continuous, mechanical, or progress motion.
- Long motion can suit deliberate storytelling when it does not delay action.
- Abrupt changes can be preferable for frequent controls, reduced motion, or urgent feedback.
- Spring overshoot is not inherently wrong; judge semantic fit and settling behavior.
- Low-risk opacity or color changes may remain under reduced motion.
- Capture tooling can create apparent jank; reproduce on the target.
- Different timings may intentionally encode hierarchy or distance.

## Output Format

Use `templates/audit-report.md`. Include transition pair, trigger and interruption sequence, environment, measurements, expected settled state, actual result, mechanism, impact, recommendation, provenance, evidence records, and false-positive check. Prioritize blocked input, wrong final state, accessibility harm, and severe performance cost before polish. Report taste differences as non-blocking observations.
