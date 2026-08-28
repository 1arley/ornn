# Visual Hierarchy

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Visual hierarchy** is the arrangement of visual elements so their order of
importance is obvious. It is created through contrast, size, spacing, color, weight,
and proximity. When hierarchy is wrong, users act on the wrong element — the most
dangerous version being a destructive action visually dominating a safe one.

## Why does it fail

1. **Destructive action dominates**: delete/remove is the largest, highest-contrast,
   most prominent button while the primary safe action is muted.
2. **Primary action is not distinct**: the main CTA blends with secondary actions or
   background.
3. **Spacing is uniform**: no visual grouping; related actions are not closer to each
   other than to unrelated ones.
4. **Contrast without hierarchy**: everything is high contrast, so nothing stands
   out; or everything is low contrast, so nothing is readable.
5. **Visual noise**: decorative elements compete with content; the page has no clear
   focal point.
6. **Generic AI slop patterns**: centered everything, uniform gradients, emoji as
   icons, excessive drop shadows — patterns that look designed but communicate
   nothing about priority.

## What invariants matter

```text
the primary action is visually dominant (safe action > destructive action)
related actions are grouped by proximity
text hierarchy follows content hierarchy (title > body > caption)
contrast serves hierarchy, not decoration
```

## Patterns

- **Destructive action de-emphasis**: destructive actions are secondary (text link
  or bordered, muted red), placed away from the primary action, with a
  confirmation step.
- **One primary action per view**: a single dominant CTA; others are visually
  subordinate.
- **Type scale**: an explicit type ramp (display, heading, body, caption) with
  consistent sizes and weights.
- **Spacing system**: consistent spacing units so grouping and separation read
  clearly.
- **Reduced visual noise**: limited palette, restrained shadows, purposeful
  whitespace; every decoration earns its place.

## What evidence to look for

- The size, color, and placement of destructive vs safe actions.
- The contrast and weight of the primary CTA relative to its container.
- The spacing between related vs unrelated elements.
- The type ramp consistency across the view.
- Visual noise that competes with the content's purpose.

## Related skills

`visual-quality-review` (evaluate craft), `ux-review` (clarity), `interaction-design`
(action states), `user-flow-audit` (action sequence).