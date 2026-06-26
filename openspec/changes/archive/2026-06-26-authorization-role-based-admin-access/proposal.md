## Why

The app currently has no role distinction: any authenticated session can access
all `/admin/*` routes, meaning a helper account created via invite has full
administrative access (user management, invites, data export/import). With
helper accounts now in active use during the move, this is a live privilege
escalation risk.

## What Changes

- The `User` model gains a `role: "admin" | "user"` field.
- Seed provisioning writes `role: "admin"` for both owner accounts.
- A one-time migration script promotes all existing role-less users to `"admin"`
  (preserving current access for the two owners).
- `consumeInvite` writes `role: "user"` on the newly created helper account.
- A new `requireAdmin()` guard returns 403 for any session whose user has
  `role !== "admin"`.
- Every `/admin/*` route calls `requireAdmin()`.
- The "Verwaltung" nav link in `_app.tsx` is hidden for `role: "user"` sessions.

**Non-goals:** No fine-grained permissions beyond admin/user. No per-resource
ACLs. No role-change UI in this change.

## Capabilities

### New Capabilities

- `authorization`: Role-based access control (admin vs. user); `requireAdmin()`
  guard applied to all `/admin/*` routes; nav adapts to role.

### Modified Capabilities

- `auth`: `User` model gains `role` field; seed provisioning updated to write
  `role: "admin"`; migration script for existing users.
- `invites`: `consumeInvite` now writes `role: "user"` on the created account.

## Impact

- **`lib/auth/types.ts`** — add `role` field to `User`.
- **`lib/auth/userRepo.ts`** (or seed logic) — write `role: "admin"` in seed.
- **`lib/auth/middleware.ts`** — new `requireAdmin()` export.
- **`lib/invites/inviteRepo.ts`** — `consumeInvite` sets `role: "user"`.
- **`routes/admin/*`** — all handlers call `requireAdmin()`.
- **`routes/_app.tsx`** — conditionally hide "Verwaltung" nav item.
- **`scripts/migrate-user-roles.ts`** — new one-time migration script.
- No new external dependencies.
