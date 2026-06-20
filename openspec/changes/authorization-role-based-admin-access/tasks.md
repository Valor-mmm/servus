## 1. Data model

- [x] 1.1 Add `role: "admin" | "user"` to the `User` type in `lib/auth/types.ts`
- [x] 1.2 Update all `User` constructors and factory helpers to require `role`

## 2. Seed and migration

- [x] 2.1 Write failing unit test: seeded user record has `role: "admin"`
- [x] 2.2 Update seed logic to write `role: "admin"` on new seeded accounts
- [x] 2.3 Write migration script `scripts/migrate-user-roles.ts` — iterates
      `["user", *]`, promotes role-less users to `"admin"`, idempotent
- [x] 2.4 Write unit test for migration script: two role-less users → both
      promoted; re-run → no changes

## 3. Invite consumption

- [x] 3.1 Write failing integration test: consuming an invite creates a user
      with `role: "user"`
- [x] 3.2 Update `consumeInvite` in `lib/invites/inviteRepo.ts` to write
      `role: "user"` on the new account

## 4. Admin guard middleware

- [x] 4.1 Write failing unit test: `requireAdmin()` returns 403 response for a
      session with `role: "user"`
- [x] 4.2 Implement `requireAdmin(ctx)` in `lib/auth/middleware.ts` — calls
      `requireSession`, checks `role !== "admin"`, returns 403 page or null
- [x] 4.3 Add i18n key `auth.forbidden` (German: "Kein Zugriff. Diese Seite ist
      nur für Administratoren.") to `lib/i18n/locales/de.ts`

## 5. Apply guard to admin routes

- [x] 5.1 Write failing integration test: helper session → GET `/admin` → 403
- [x] 5.2 Add `requireAdmin(ctx)` call to all `/admin/*` route handlers:
  - `routes/admin/index.tsx`
  - `routes/admin/export.ts`
  - `routes/admin/import.ts`
  - `routes/admin/invites/index.tsx` (if separate from `/admin`)
  - `routes/admin/invites/[id]/revoke.ts`
  - `routes/admin/users/[username]/delete.tsx`
  - `routes/admin/users/[username]/delete-confirm.ts`

## 6. Navigation

- [x] 6.1 Write unit test: `_app.tsx` renders "Verwaltung" link only when
      `role === "admin"`
- [x] 6.2 Update `routes/_app.tsx` to conditionally render the "Verwaltung" nav
      link based on session user role

## 7. Validation

- [x] 7.1 Run `deno task test` — all unit and integration tests pass
- [x] 7.2 E2E test (Playwright, `tests/e2e/authorization.spec.ts`):
  - Create a helper via invite → assert "Verwaltung" not in nav
  - Navigate to `/admin` as helper → assert 403 page
  - Log in as admin → assert "Verwaltung" in nav → assert `/admin` loads 200
- [ ] 7.3 Run `deno task e2e` — all E2E tests pass
