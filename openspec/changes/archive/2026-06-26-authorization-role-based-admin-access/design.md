## Context

The app has two primary users (owners) and short-lived helper accounts created
via invite codes during the house move. Currently all authenticated sessions
have identical access — including every `/admin/*` route (user management, data
export/import, invite management). Helpers should not have that access.

The `User` KV record is a plain object in `lib/auth/types.ts`. Roles are a
single new field on that record. No external dependency is needed.

## Goals / Non-Goals

**Goals:**

- Block helper sessions from reaching any `/admin/*` route.
- Hide the "Verwaltung" nav link for helper sessions so the UI is clean.
- Preserve full access for the two existing owner accounts (migration → admin).
- Make `consumeInvite` mark new accounts as `role: "user"` by default.

**Non-Goals:**

- No fine-grained permissions beyond admin/user.
- No role-change UI (role is set at account creation; only way to promote is a
  manual KV edit or migration script).
- No per-resource ACLs.

## Decisions

### Role stored in the `User` KV record

**Decision:** Add `role: "admin" | "user"` to the `User` type and persist it in
the existing `["user", username]` KV key.

**Alternatives considered:**

- Separate `["user-role", username]` key: adds a second KV read on every auth
  check; no benefit for a two-value enum.
- Derive role from username prefix: fragile, couples business logic to naming.

### Migration promotes all existing role-less users to `"admin"`

**Decision:** A one-time idempotent migration script iterates the `["user", *]`
prefix and sets `role: "admin"` on any user that lacks a `role` field.

**Rationale:** The only users in production are the two owners; there are no
helper accounts yet (invite consumption will start writing `role: "user"` going
forward). Promoting everyone to admin is the safe default.

### `requireAdmin()` returns 403, not a redirect

**Decision:** Role-insufficient access returns HTTP 403 (not 302 to `/login`).

**Rationale:** The user is already authenticated; redirecting to login is
confusing. A bare 403 page makes the access denial explicit. The existing
`requireSession()` already handles the unauthenticated redirect case.

### Guard applied at each route handler (not a middleware wrapper)

**Decision:** Call `requireAdmin(ctx)` at the top of each `/admin/*` handler
rather than registering a global middleware.

**Rationale:** Fresh 2 does not have a per-subtree middleware layer. A route-
level call is explicit, easy to test, and avoids a global intercept that could
accidentally block non-admin routes.

## Risks / Trade-offs

- **Migration not run before first deploy** → existing users temporarily lose
  admin access. Mitigation: run
  `deno run --allow-all scripts/migrate-user-roles.ts` in the same deploy
  sequence; document in README.
- **Future `/admin/*` route added without guard** → silent privilege escalation.
  Mitigation: regression test in the admin integration test suite checks for the
  presence of `requireAdmin()` on all admin routes.

## Migration Plan

1. Merge this change.
2. Before/during deploy, run:
   ```
   deno run --allow-all --unstable-kv scripts/migrate-user-roles.ts
   ```
3. Script is idempotent — safe to re-run.
4. No rollback needed: the `role` field is optional in the type; old code simply
   ignores the extra field.
