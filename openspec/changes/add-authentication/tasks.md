## 1. Preconditions

- [ ] 1.1 Confirm M0 foundation is in place: `deno.json`, Fresh 2 skeleton boots
      on `deno task start`, Playwright smoke test passes, CI is green on main,
      `lib/i18n/` scaffold exists with German locale file and `t()` function,
      `renovate.json` is committed.
- [ ] 1.2 Confirm secrets are documented in `README.md`: `SERVUS_SESSION_KEY`
      (32-byte hex) and `SERVUS_SEED_USERS` (JSON array). Production usernames
      are `monster` and `maus`.
- [ ] 1.3 Add an Argon2id library to `deno.json` imports, pinned by exact
      version. Record the choice in `docs/decisions/argon2-library.md` (one
      paragraph: which lib, why, fallback plan).

## 2. KV repository layer (foundation for all auth state)

- [ ] 2.1 Write failing unit tests for `lib/kv/client.ts`: opens KV, supports an
      in-memory mode for tests, exposes typed `get`/`set`/`atomic` wrappers.
- [ ] 2.2 Implement `lib/kv/client.ts` to make tests pass.
- [ ] 2.3 Write failing tests for `lib/auth/userRepo.ts` (create user, find by
      username, never overwrite hash) against in-memory KV.
- [ ] 2.4 Implement `lib/auth/userRepo.ts`.
- [ ] 2.5 Write failing tests for `lib/auth/sessionRepo.ts` (create, lookup,
      delete, list-by-user, throttled lastSeen update).
- [ ] 2.6 Implement `lib/auth/sessionRepo.ts`.
- [ ] 2.7 Write failing tests for `lib/auth/rateLimitRepo.ts` (sliding window
      counters for IP and username with TTL).
- [ ] 2.8 Implement `lib/auth/rateLimitRepo.ts`.

## 3. Crypto primitives

- [ ] 3.1 Write failing tests for `lib/auth/password.ts`: `hash(password)`
      returns a PHC string, `verify(hash, password)` returns true for the right
      password and false otherwise, plaintext password is never present in
      returned values.
- [ ] 3.2 Implement `lib/auth/password.ts` using Argon2id with
      `m=64MiB, t=3, p=1`.
- [ ] 3.3 Write failing tests for `lib/auth/sessionCookie.ts`: signs a session
      ID with HMAC-SHA256, verifies signature, rejects tampered values.
- [ ] 3.4 Implement `lib/auth/sessionCookie.ts`.
- [ ] 3.5 Write failing tests for `lib/auth/csrf.ts`: generate token, verify
      match, constant-time compare.
- [ ] 3.6 Implement `lib/auth/csrf.ts`.

## 4. Seeding

- [ ] 4.1 Write failing tests covering: empty seed creates no users; two-user
      seed creates both; reboot with existing users skips them; reboot with a
      real password change does not overwrite the hash.
- [ ] 4.2 Implement `lib/auth/seed.ts` and wire it into `main.ts` boot.
- [ ] 4.3 Verify logs emit `seeded N user(s), skipped M existing` and never
      include the plaintext password (test asserts on captured stderr).

## 5. Login / logout handlers

- [ ] 5.1 Write failing integration tests for POST `/login`: success sets the
      cookie and creates a session; wrong password fails; unknown username fails
      with the same response shape; rate-limited responses return 429.
- [ ] 5.2 Write failing test asserting constant-time behaviour: unknown-user
      path performs a dummy hash comparison and increments the IP counter.
- [ ] 5.3 Implement `routes/login.tsx` (GET form + POST handler) and supporting
      form component. All user-visible strings MUST go through `t()` — no inline
      German or English text in JSX.
- [ ] 5.4 Write failing integration tests for POST `/logout`: deletes session,
      clears cookie, requires CSRF token.
- [ ] 5.5 Implement `routes/logout.ts`.

## 6. Middleware

- [ ] 6.1 Write failing tests for `lib/auth/middleware.ts` `requireAuth`:
      unauthenticated GET redirects to `/login?next=...`; unauthenticated
      non-GET to a protected route returns 401; authenticated request passes;
      expired session is rejected and removed lazily.
- [ ] 6.2 Implement `requireAuth` and register it in `main.ts` with the
      documented public-route allowlist.
- [ ] 6.3 Write failing tests for `csrfGuard`: missing token on mutation returns
      403; wrong token returns 403; matching token passes.
- [ ] 6.4 Implement `csrfGuard` and apply to all mutation methods globally.
- [ ] 6.5 Write failing tests for `securityHeaders`: every response carries
      HSTS, nosniff, Referrer-Policy, CSP, Permissions-Policy with the
      documented values.
- [ ] 6.6 Implement `securityHeaders` middleware applied outermost in `main.ts`.

## 7. Rate limiting end-to-end

- [ ] 7.1 Write failing integration tests for IP lockout (10 failures → 429) and
      username backoff (5 failures → 429 with growing Retry-After), plus
      reset-on-success.
- [ ] 7.2 Implement the rate-limit check inside the `/login` handler using
      `rateLimitRepo`.

## 8. Logging redaction

- [ ] 8.1 Write failing tests for `lib/log.ts`: structured log calls redact
      `password`, `passwordHash`, `sessionId`, `csrfToken`, `cookie`,
      `sessionKey`.
- [ ] 8.2 Implement `lib/log.ts` and replace direct `console.*` calls in auth
      code paths.

## 9. End-to-end verification with Playwright

- [ ] 9.1 Add Playwright test seeding two users via env vars on a freshly
      started dev server.
- [ ] 9.2 E2E scenario: visiting `/` while unauthenticated redirects to
      `/login?next=%2F`; logging in succeeds and lands on `/`.
- [ ] 9.3 E2E scenario: wrong password shows the generic error message and does
      not log in.
- [ ] 9.4 E2E scenario: after 10 wrong attempts the form responds with the 429
      error and a retry hint.
- [ ] 9.5 E2E scenario: logout returns the user to `/login` and an old session
      cookie no longer works.

## 10. Wrap-up

- [ ] 10.1 Update `openspec/specs/` by archiving the change with
      `openspec archive add-authentication` _(actually done in the archive step
      — here we just verify the specs render without warnings via
      `openspec validate add-authentication`)_.
- [ ] 10.2 Final manual smoke: deploy to a Deno Deploy preview, log in with both
      seeded users, log out, confirm headers via `curl -I`.
