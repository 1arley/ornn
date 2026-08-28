# Quotas and Limits

> What is this concept? Why does it fail? What invariants matter? What patterns exist? What evidence should an agent look for?

## What is this concept

A **quota or limit** is a business rule that restricts how many times an action can be
performed (exports per day, seats per account, API calls per minute, storage per
user). The invariants are: the limit is checked before the action, the count is
updated atomically, and the enforcement is server-side.

## Why does it fail

1. **UI-only enforcement**: the button is disabled after N clicks; the API still
   accepts the Nth+1 call.
2. **Non-atomic counter**: read the current count, check the limit, increment the
   count — two concurrent requests bypass the limit.
3. **Count resets on a client-side timer**: the client refreshes the window; the
   server did not persist the first usage.
4. **No limit per user**: the limit is global; one user can exhaust the shared
   quota.
5. **Limit resets, the history does not**: old actions roll off the window, but the
   cumulative effect (e.g., storage used) is not bounded.

## What invariants matter

```text
the limit is checked and enforced server-side
the counter is updated atomically with the action
the counter is persisted and survives restart
the limit is scoped to the correct identity (user, account, IP, etc.)
```

## Patterns

- **Atomic increment + check**: `UPDATE quota SET used = used + 1 WHERE
  used < limit AND user_id = ?` — the database rejects the increment when the
  limit is reached.
- **Dedicated quota table**: `quota (user_id, action_type, period_start, used,
  max_allowed, UNIQUE(user_id, action_type, period_start))`.
- **Leaky bucket / token bucket**: for rate limits; the count is decremented and
  checked atomically.
- **Hard limit + soft limit**: soft limit warns; hard limit rejects. Both are
  enforced server-side.

## What evidence to look for

- The quota check in the handler: read + compare + write vs atomic statement.
- Whether the count is persisted or in-memory only.
- Whether the limit is scoped by user, by IP, by account, or not at all.
- The UI behavior vs the API behavior: does the UI enforce alone?

## Related skills

`business-logic-audit` (extract the rule), `api-abuse-audit` (bypass the UI),
`race-condition-hunter` (concurrent bypass), `input-trust-audit` (client-supplied
usage count).