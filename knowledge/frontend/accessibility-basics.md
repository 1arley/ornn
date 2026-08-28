# Accessibility Basics

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

**Accessibility** (a11y) is the property of an interface being usable by people with
disabilities: keyboard-only users, screen reader users, low-vision users, motor
impairment, and vestibular sensitivity. It is not a feature; it is a baseline of
correctness. The WCAG principles — perceivable, operable, understandable, robust —
are the standard.

## Why does it fail

1. **Mouse-only interactions**: a `click` handler on a `<div>` without keyboard
   support; the action is unusable by keyboard.
2. **No focus management**: modals that do not trap focus, dialogs that do not
   restore focus, or focus lost after an action.
3. **Semantic HTML not used**: custom elements without roles, a `<div>` used as a
   button, a list rendered as text.
4. **Missing names**: images without alt, buttons with only an icon, inputs without
   labels.
5. **Low contrast**: text that fails WCAG contrast ratios, especially on focus
   indicators.
6. **Small touch targets**: clickable areas below 24×24 CSS px (44×44
   recommended).
7. **Reduced motion ignored**: animations that cannot be disabled and hide content
   for users with vestibular disorders.

## What invariants matter

```text
every interactive element is keyboard-operable
every interactive element has an accessible name
every dynamic change is announced to screen readers
every text meets contrast ratios
every animation respects reduced-motion preferences
```

## Patterns

- **Native elements first**: use `<button>`, `<a>`, `<input>`, `<label>`,
  `<dialog>` — the browser provides the semantics for free.
- **Focus management**: move focus into a modal on open, trap Tab inside, restore
  focus to the trigger on close.
- **Accessible naming**: `aria-label` for icon-only buttons, visible labels for
  inputs, `alt` for meaningful images, `role="alert"` for errors.
- **Announcement of state**: `aria-live="polite"` regions for status updates,
  `aria-busy` for loading, `aria-expanded` for disclosure.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables nonessential
  animation while preserving the state change.

## What evidence to look for

- The element type and its event handlers: keyboard vs mouse only.
- `tabindex`, focus trap implementation, and focus restore logic.
- `aria-*` attributes and their correctness against the ARIA spec.
- The computed contrast ratio of text and focus indicators.
- The presence of a reduced-motion media query.

## Related skills

`accessibility-review` (evaluate WCAG), `interaction-design` (states and focus),
`animation-review` (motion), `ux-review` (clarity).