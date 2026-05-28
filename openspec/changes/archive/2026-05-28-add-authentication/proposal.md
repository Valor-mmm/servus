## Why

The application must only be reachable by the two household users plus a small,
controlled set of short-lived invited helpers during the upcoming move. Until
authentication exists, the app cannot be deployed publicly to
`servus.valor.codes`. We additionally cannot ship any inventory feature (M3 and
beyond) without first having a logged-in user identity to attach data and audit
trails to.

This change introduces a custom, brute-force-resistant authentication layer.
Custom (not third-party) auth is a project-level constraint to keep the running
cost at zero and avoid vendor lock-in or major-version churn from an identity
provider.

## What Changes

- A new login page at `/login` accepts a username + password and, on success,
  issues a session cookie.
- A new logout endpoint at `/logout` ends the current session.
- Sessions are signed HTTP-only cookies bound to a server-side record in Deno KV
  with idle and absolute expiry.
- Passwords are hashed with Argon2id (memory-hard, salted per user). Plaintext
  passwords never leave the request boundary.
- Initial users are **seeded** on first boot from environment variables. There
  is no public registration in this change (invite codes arrive in M2).
- Login resists brute force via per-IP and per-username rate limiting with
  exponential backoff, and answers in constant time to avoid username
  enumeration.
- All state-changing endpoints require a CSRF token bound to the active session.
- A global security headers middleware applies `Content-Security-Policy`,
  `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, and
  a minimal `Permissions-Policy` to every response.
- Routes outside `/login`, `/logout`, and a small allowlist of public assets
  redirect unauthenticated requests to `/login`.

**New dependency:** an Argon2id implementation. We will use a single small,
stable library (or the WebAssembly reference implementation if a maintained
Deno-friendly wrapper isn't available). Hashing is not something we want to
re-implement, and no Deno standard-library equivalent exists.

**Non-goals (deliberately deferred):**

- Self-service password reset. Until the household is larger than 2, we recover
  manually via a re-seed.
- Email verification, MFA, OAuth, magic links. Out of scope for MVP.
- Invite codes for temporary users. That's the next change (`add-invite-codes`).
- Roles beyond `admin` and `user`. Both seeded users are admins for MVP.
- Audit log UI. We will log security events to stderr only.
- IP geolocation, device fingerprinting, or any anti-abuse beyond rate limiting.

**What this change does NOT secure or harden:**

- It does not protect against a compromised host or leaked KV credentials.
- It does not protect against a phishing attack that captures a valid password.
- It does not protect against an attacker who already has a valid session cookie
  (no per-request re-authentication, no step-up auth).
- It does not protect data at rest beyond what Deno Deploy provides for KV.

## Capabilities

### New Capabilities

- `auth`: Authenticates a user, issues and validates session cookies, resists
  brute-force attempts, and exposes middleware that gates routes and protects
  state-changing endpoints with CSRF tokens.

### Modified Capabilities

<!-- None — this is the first capability in the project. -->

## Impact

- **Code:** New `lib/auth/` module (password hashing, session store, rate
  limiter, CSRF). New `routes/login.tsx`, `routes/logout.ts`. New middleware
  registered in `main.ts` for auth gating, CSRF, and security headers. A small
  KV typed wrapper for session and rate-limit records under `lib/kv/`.
- **APIs:** New POST `/login`, POST `/logout`. All future mutation endpoints
  must include the CSRF token.
- **Dependencies:** Adds one Argon2id library (pinned, vendored if its
  maintenance lapses).
- **Configuration:** Two new required environment variables for first-boot
  seeding (e.g. `SERVUS_SEED_USERS` and `SERVUS_SESSION_KEY`). Documented in
  README.
- **Deployment:** Deno Deploy environment must have `SERVUS_SESSION_KEY` set to
  a 32-byte random value. Rotation procedure documented but not automated.
- **Tests:** New unit tests for hashing, session signing, and rate limiting. New
  integration tests against an in-memory KV. New Playwright E2E covering login,
  logout, lockout, and gated-route redirect.
- **Future work unblocked:** `add-invite-codes` (M2) and all inventory work
  (M3+) can attach to authenticated users after this change.
