## 1. Cookie persistence — failing tests

- [x] 1.1 Add unit test asserting `lib/auth/loginHandler.ts` Set-Cookie includes
      `Max-Age=5184000` alongside the existing
      `HttpOnly; Secure; SameSite=Strict; Path=/` attributes
- [x] 1.2 Add unit test asserting `lib/invites/index.ts` redemption Set-Cookie
      includes `Max-Age=5184000`
- [x] 1.3 Run tests; confirm both fail with the expected attribute-missing
      assertion

## 2. Cookie persistence — implementation

- [x] 2.1 Export `ABSOLUTE_TTL_SECONDS` from `lib/auth/sessionRepo.ts` derived
      from the existing `ABSOLUTE_TTL_MS` constant (single source of truth)
- [x] 2.2 Add `Max-Age=${ABSOLUTE_TTL_SECONDS}` to the cookie emitted by
      `lib/auth/loginHandler.ts:81-87`
- [x] 2.3 Add `Max-Age=${ABSOLUTE_TTL_SECONDS}` to the cookie emitted by
      `lib/invites/index.ts:100-106`
- [x] 2.4 Run unit tests from §1; confirm both now pass

## 3. Rolling lastSeen — failing test

- [x] 3.1 Add integration test for `applyRequireAuth`: given a session whose
      `lastSeen` was set more than `TOUCH_THROTTLE_MS` ago, after middleware
      passes, the stored `lastSeen` is updated to the current time
- [x] 3.2 Add integration test for the inverse: given a session with a fresh
      `lastSeen`, middleware passing does NOT change the value
- [x] 3.3 Run tests; confirm 3.1 fails (touchSession is never called)

## 4. Rolling lastSeen — implementation

- [x] 4.1 Import `touchSession` from `sessionRepo` into `lib/auth/middleware.ts`
- [x] 4.2 In `applyRequireAuth`, immediately after the idle-check passes and
      before returning `{ pass: true, user }`, call
      `await touchSession(session.sessionId)`
- [x] 4.3 Wrap the call in try/catch and log (not throw) on failure, so a
      transient KV write blip does not cascade into a forced logout
- [x] 4.4 Run integration tests from §3; confirm both now pass

## 5. Strong consistency on session read — failing test

- [x] 5.1 Add integration test that spies on `kv.get` and asserts `findSession`
      is invoked with `{ consistency: "strong" }`
- [x] 5.2 Run test; confirm it fails (current code uses default consistency)

## 6. Strong consistency — implementation

- [x] 6.1 In `lib/auth/sessionRepo.ts:findSession`, pass
      `{ consistency: "strong" }` to `kv.get`
- [x] 6.2 Run integration test from §5; confirm pass

## 7. E2E regression

- [x] 7.1 Add Playwright spec under `tests/e2e/auth/` that logs in, captures the
      storage state, opens a fresh `BrowserContext` populated from that storage
      state (simulating an iOS Safari cold start after eviction), navigates to a
      protected route, and asserts the page renders authenticated content
- [x] 7.2 Verify the spec passes locally (`deno task e2e`)

## 8. Spec hygiene

- [x] 8.1 Run `openspec validate add-persistent-session-cookie --strict`; fix
      any issues
- [x] 8.2 Run `deno fmt` over modified files (`lib/auth/*.ts`,
      `lib/invites/index.ts`, tests, the new openspec change folder) — required
      by repo policy before push

## 9. Final E2E verification

- [x] 9.1 Run full Playwright suite (`deno task e2e`) and confirm no regressions
      in existing auth, login, invite, or session specs
