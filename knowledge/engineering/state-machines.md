# State Machines

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **state machine** models a feature as a finite set of states and the transitions
between them. Every operation is a transition; every observable condition is a state.
Modeling a flow this way makes dead ends, impossible states, skippable steps, and
refresh/back problems visible instead of accidental.

```text
pending → paid → fulfilled → shipped
   │        │        │
   └────────┴────────┴──→ cancelled (only from allowed states)
```

## Why does it fail

1. **Transitions by client request** — the client sends a target status; the server
   never validates the source state, so `pending → shipped` becomes possible.
2. **Missing states** — a `processing` or `partial-failure` state is absent, so a
   half-done operation is silently mapped to a successful state.
3. **Skippable steps** — preconditions are not modeled, so a flow can jump ahead.
4. **Dead ends** — a state has no outgoing transition except reload, which re-runs
   side effects.
5. **Refresh/back desync** — the URL and the server disagree about which state the
   flow is in; refreshing replays or loses progress.
6. **Reversal not modeled** — the machine has no inverse edge, so "undo" is either
   impossible or implemented as a separate inconsistent operation.

## What invariants matter

```text
every transition has a valid source state
every state is reachable from entry
every state has an exit (or is a terminal state by design)
side effects are attached to transitions, not to polling
```

## Patterns

- **Guard every transition**: validate source state on the server before applying
  the new state; reject impossible transitions.
- **Model failure explicitly**: add states for in-progress, failed, partial, and
  retry; map each external failure to a state.
- **Idempotent transitions**: re-applying the same transition returns the current
  state instead of duplicating the effect.
- **Persist, don't rely on session**: refresh should reconstruct state from the
  server, not from the URL or memory.
- **State machines for rewards**: `granted → reversed` edges are a machine too; a
  reward without a reverse edge is a farming vector.

## What evidence to look for

- The state column/enum and its transitions in code.
- Whether the transition guard reads the current persisted state.
- The client/URL state vs server state after refresh.
- Whether failure branches create a state or get lost.

## Related skills

`user-flow-audit` (map the machine), `state-consistency-audit` (multiple copies of
state), `business-logic-audit` (transition rules), `error-flow-audit` (failure
states), `gamification-audit` (reward transitions).
