## Why

Helpers are asked to choose a username and password when redeeming an invite,
but they will pick weak passwords (e.g. "123456") that undermine account
security. The invite link itself already carries 160 bits of entropy — far more
than any password a helper would choose — so adding a password step gives a
false sense of security while degrading usability. Eliminating the form and
issuing a session directly from the invite code is both simpler for the helper
(scan → in the app) and more secure overall.

## What Changes

- **BREAKING (UX)** `GET /invite/[code]` no longer shows a username + password
  form. Instead it shows a single "Zugang aktivieren" confirmation button.
- **BREAKING (flow)** `POST /invite/[code]` no longer accepts
  `username`/`password` fields. It validates the invite code, atomically creates
  a helper account with a system-generated username and a cryptographically
  random (discarded) password hash, creates a session, sets the session cookie,
  and redirects to `/`.
- The helper is logged in immediately after one button press — no credentials to
  remember or forget.
- If a helper's cookie is lost (cleared browser, new device, session expiry),
  the admin mints a new invite; there is no password-based fallback by design.
- All downstream changes are limited to `routes/invite/[code].tsx`,
  `lib/invites/index.ts` (`consumeInvite` signature), `lib/i18n/locales/de.ts`,
  and integration/E2E tests.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `invites`: The "Invite code consumption" requirement changes substantially —
  visitors no longer choose credentials; the system generates them and issues a
  session directly.

## Impact

- **`routes/invite/[code].tsx`**: Registration form replaced by a one-button
  confirmation page. POST handler creates account + session rather than
  redirecting to `/login`.
- **`lib/invites/index.ts`**: `consumeInvite(rawCode, username, password)` → new
  `consumeInvite(rawCode)` that generates the username internally and returns a
  session cookie string rather than a simple `ok/fail` result.
- **`lib/auth/sessionRepo.ts`**: No changes needed; existing `createSession` is
  reused.
- **`lib/auth/userRepo.ts`**: No changes to the user model; `passwordHash`
  stores a random Argon2id-hashed value whose preimage is discarded, making
  password login impossible for helpers without changing the login handler.
- **No new dependencies.**

## Non-goals

- Giving helpers a way to set a password later (not needed for short-lived move
  helpers).
- Cross-device access without a new invite (by design — the session cookie is
  the only credential).
- Showing a helper's generated username in the admin UI (already not shown).
- Changing how primary user accounts (admin, owner's wife) work — they keep
  their normal username + password flow.
