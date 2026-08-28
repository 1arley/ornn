# Interaction Feedback

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Interaction feedback** is the system's response to a user action. Every interactive
element has a set of states: idle, hover, focus, pressed, disabled, loading, success,
error. A missing or ambiguous feedback state leaves the user uncertain whether the
action registered, what the system is doing, and whether the operation succeeded or
failed.

## Why does it fail

1. **No feedback on action**: the user clicks and nothing visibly changes; the
   request is sent but the user cannot tell.
2. **Delayed feedback without visual proxy**: the action takes two seconds; the
   component stays idle during the entire time.
3. **Feedback stops at the visual**: the state changes visually but assistive
   technology receives no announcement.
4. **Conflicting feedback**: the button shows a spinner while the error border
   is already red, or the success message appears before the server confirms.
5. **Feedback is not owned by the action**: a toast appears from a different
   location, making it unclear which action triggered it.
6. **Feedback is not persistent**: the error message disappears after a timeout,
   even though the user did not acknowledge it.

## What invariants matter

```text
every action produces immediate feedback (optimistic or pending)
every state change is communicated to both visual and assistive channels
loading states are proportional to the expected duration
error states are persistent until the user dismisses or retries
```

## Patterns

- **Optimistic UI for safe actions**: show the expected result immediately; revert
  on failure.
- **Loading state**: a spinner or skeleton; disable the action button; announce
  `aria-busy="true"`.
- **Error state near the action**: inline error message below the field, not a
  distant toast; provide a retry action.
- **Success confirmation**: a brief visible confirmation that does not block the
  next action; screen reader announcement.

## What evidence to look for

- The click/change handler: what state does it set before the async call?
- The loading/error/success branches in the component.
- Whether `aria-live` or `role="alert"` is used for dynamic announcements.
- The error message placement: inline, toast, or silent.

## Related skills

`interaction-design` (state enumeration), `accessibility-review` (announcements),
`ux-review` (feedback clarity), `user-flow-audit` (state after feedback).