## Why

On mobile (especially iOS Safari, the primary device for one of the two users),
users are silently logged out after roughly a minute of inactivity and must
re-enter credentials. Two layered defects cause this: the session cookie is
emitted without a `Max-Age` attribute, so iOS drops it whenever the OS evicts
Safari from memory; and the middleware never calls the `touchSession` helper
that the existing `auth` spec already mandates, so `lastSeen` is frozen at login
time and the rolling 14-day idle window collapses into an absolute window from
issuance. The result is daily friction on the device used most.

## What Changes

- Session cookie emitted at login and at invite redemption MUST include
  `Max-Age` aligned with the session's absolute timeout, so the cookie survives
  browser-process eviction and persists across restarts.
- Middleware's `requireAuth` MUST call `touchSession` on every successful
  authenticated request (already covered by the existing `auth` requirement,
  currently un-implemented — this change ships the fix).
- `findSession` switches from default (eventual) KV consistency to
  `{ consistency: "strong" }`, eliminating the cross-edge-region read lag that
  can cause a freshly-renewed session to read as missing on the next request.
- New Playwright regression that simulates a tab-reset / cookie-jar-persistence
  scenario and verifies the user is still authenticated.

## Non-goals

- Reworking session expiry on `POST` to redirect-and-preserve the form (tracked
  separately as M4 in the pre-launch plan).
- Adding per-device session UI ("log out other sessions"). Out of scope.
- Touching the absolute-timeout (60 days) or idle-timeout (14 days) values.
- Changing the cookie name, signing scheme, or any other security attribute
  (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` are all retained).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auth`: the session-cookie requirement gains a `Max-Age` obligation tying
  cookie lifetime to the absolute session timeout. No other auth requirements
  change.

## Impact

- **Code**: `lib/auth/loginHandler.ts` (cookie emission), `lib/invites/index.ts`
  (post-redemption cookie emission), `lib/auth/middleware.ts` (call
  `touchSession`), `lib/auth/sessionRepo.ts` (strong consistency on
  `findSession`).
- **Specs**: delta to `openspec/specs/auth/spec.md` adding the `Max-Age` clause
  and a persistence scenario.
- **Tests**: new unit test for the cookie attributes; new integration test that
  `touchSession` is invoked on authenticated request paths; new Playwright E2E
  that asserts session survives a fresh tab + cookie-jar reload.
- **Dependencies**: none added.
- **Threats not addressed**: a stolen persistent cookie remains valid for its
  `Max-Age` (60 days) just as the server-side session would — no change in this
  risk envelope. CSRF posture is unchanged (`SameSite=Strict` + per-session
  token still required).
