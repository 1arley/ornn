# UI States

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A UI component is a set of **states** with transitions between them: idle, loading,
empty, error, disabled, partial, success, and the interactive states (hover, focus,
pressed). A well-designed component renders the right content for every state and
transitions safely between them. Most UI bugs are missing or conflicting states.

```text
idle → loading → success
         │          │
         └── error ←┘   empty, disabled, partial, retry
```

## Why does it fail

1. **Missing loading state**: the user clicks and sees nothing; no feedback that the
   request is in flight.
2. **Missing empty state**: a list shows nothing with no explanation or next step.
3. **Missing error state**: an API failure leaves the previous content up, or a
   blank area, with no retry.
4. **Partial success not modeled**: half the operation succeeded; the UI shows all
   or nothing.
5. **Conflicting states**: a disabled button that still shows hover/pressed
   feedback, or a loading overlay that blocks the already-loaded content.
6. **Disabled state not real**: the button looks disabled but is still clickable, or
   vice versa.

## What invariants matter

```text
every state has a visible representation
every transition has defined behavior (disable, cancel, retry)
feedback communicates state change to the user
screen readers receive the same state information visually
```

## Patterns

- **State enumerations**: list every state a component can be in; write a test or a
  story for each.
- **Derived, not parallel state**: derive `disabled`/`loading` from a single status
  field rather than maintaining three booleans that can conflict.
- **Accessible state announcements**: `aria-busy`, `aria-live` for loading,
  `aria-disabled` + real disabling, focus moved on state change.
- **Error + retry as a first-class state**: error state includes the retry action
  and preserves the user's input.

## What evidence to look for

- The status variable and all branches that render from it.
- Whether the disabled attribute/aria-disabled matches the visual disabled state.
- Whether loading is announced to assistive technology.
- Whether the empty and error states exist in the component or are blank.

## Related skills

`interaction-design` (state feedback), `accessibility-review` (announcements),
`ux-review` (empty/error treatment), `state-consistency-audit` (state divergence
across layers).