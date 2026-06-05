## Context

`servus` has three intertwined defects that surface as "I keep getting logged
out on my phone":

1. **Cookie is non-persistent.** `lib/auth/loginHandler.ts:81-87` and
   `lib/invites/index.ts:100-106` emit `Set-Cookie` with
   `HttpOnly; Secure; SameSite=Strict; Path=/` but no `Max-Age` or `Expires`.
   Browsers treat this as a "session cookie" that is discarded whenever the
   browser process ends. iOS Safari aggressively evicts background tabs (and
   Safari itself) from memory under RAM pressure — a phone call, a brief switch
   to another app, or an idle screen can be enough. When the user returns,
   Safari cold-starts and the cookie is gone.

2. **`touchSession` is dead code.** `lib/auth/sessionRepo.ts:79-93` defines a
   throttled (≤1/hour) updater for `lastSeen`. The `auth` spec already requires
   it (Requirement: Session lifetime). But `lib/auth/middleware.ts` never calls
   it. So `lastSeen` is frozen at the value set during `createSession`, and the
   14-day idle window is absolute-from-login rather than rolling. A user who
   uses the app daily for two weeks is still logged out on day 15 because
   `Date.now() - session.lastSeen > IDLE_TTL_MS` trips on the first request
   after the window closes.

3. **Eventual-consistency read in `findSession`.** `kv.get` defaults to
   `{ consistency: "eventual" }`. On Deno Deploy's multi-region edge, a session
   row written in one region can take seconds to propagate to others. Two
   requests in quick succession from the same client can hit different edges;
   the second can read the session as missing and 302 the user to `/login`.

The three issues share a single user-visible symptom and a single fix surface —
the proposal bundles them into one change rather than three separate PRs.

## Goals / Non-Goals

**Goals:**

- Session cookies survive iOS Safari memory eviction and browser restarts up to
  the absolute session timeout.
- The 14-day idle window is rolling: any authenticated request within the window
  keeps the session alive for another 14 days.
- A renewed session is immediately observable by the next request from the same
  client, regardless of edge routing.
- All three fixes ship in one PR with one Playwright scenario covering the
  user-visible outcome.

**Non-Goals:**

- Per-device session inventory or "log out other sessions" UI.
- Changing `ABSOLUTE_TTL_MS` (60 days) or `IDLE_TTL_MS` (14 days).
- Reworking session-expired-on-POST behavior (form preservation,
  redirect-with-next). Tracked separately as M4 in the pre-launch plan.
- Adding new auth dependencies or switching the cookie name / signing scheme.

## Decisions

### D1 — `Max-Age` matches the absolute timeout, not the idle timeout

The cookie's `Max-Age` is set to `ABSOLUTE_TTL_MS / 1000` (5,184,000 seconds =
60 days), the same value used as `expireIn` on the KV session row.

Rationale: `Max-Age` only controls when the _browser_ discards the cookie. The
_server_ still enforces the idle window via `lastSeen` and the absolute window
via `createdAt`. Setting `Max-Age` to the idle window would force the user to
log in every 14 days even on a desktop browser where the cookie itself never
expired — the desktop user-experience would regress. Setting it to the absolute
window matches the server's outer envelope.

Alternative considered: `Max-Age = IDLE_TTL_MS`. Rejected — would create an
artificial 14-day cap on desktop sessions that aren't otherwise idle-expiring,
since `lastSeen` is renewed on every request.

Alternative considered: omit `Max-Age` and rely on a long server-side window
plus session restoration via a separate refresh token. Rejected — adds a second
secret to manage and a new endpoint; disproportionate for a two-user app.

### D2 — Call `touchSession` from `applyRequireAuth`, not from a separate middleware

The single call site is inside `applyRequireAuth` right after the idle check
passes (`middleware.ts:79-92`). The throttle inside `touchSession` itself
(`TOUCH_THROTTLE_MS = 1 hour`) guarantees the write amplification stays bounded;
no additional middleware ordering is needed.

Rationale: the function already knows the `sessionId` and has already verified
the session is valid. Adding the call here is one line. A separate middleware
would have to re-fetch the session.

Failure mode: if `touchSession`'s KV write fails (e.g. KV outage), we choose to
log and continue serving the request. The user's auth still works for the rest
of this request; `lastSeen` simply doesn't advance. On the next hour's request,
the throttle retries. This is acceptable degradation; the alternative (failing
the request) would turn a transient KV write blip into a logout cascade.

### D3 — Strong consistency on the per-request session read

`findSession` switches from default to `{ consistency: "strong" }`. The only
caller paths are middleware (per-request, must be correct) and the CSRF lookup
that re-reads after middleware passes.

Rationale: an eventually-consistent read can lag the most recent write by enough
to falsely return `null` immediately after `touchSession` writes from another
edge. The strong-consistency read uses Deno KV's primary replica and pays one
cross-region round-trip in the worst case — measured against the user-visible
cost of a spurious logout, this is correct.

Trade-off: each session read can now incur an extra ~50ms in the worst
geographic case. Mitigation: this is a sub-50ms median path; only triggered on
the few requests where the user is actually behind a session-renewing write that
hasn't propagated.

Alternative considered: keep eventual consistency but call `touchSession`
_before_ the read. Rejected — same issue in reverse; still has a race.

Alternative considered: cache the session in middleware for the duration of one
request. Rejected — `findSession` is already invoked once per request from
middleware; CSRF lookup currently does an additional read but that can be
eliminated by passing the session through context (out of scope for this
change).

### D4 — Single PR rather than three

The three fixes have one symptom (logout-on-mobile) and one Playwright scenario
that exercises all three. Splitting would mean: PR A "cookie persistence" looks
complete but the user still logs out at the 14-day boundary; PR B "rolling
lastSeen" doesn't surface the user-visible win because PR A wasn't merged yet;
PR C "consistency" is an isolated micro-fix nobody asks for in review.

Rationale: minimum coherent unit. PLAN.md §7 item #1 already scoped them as one
PR.

### D5 — Test strategy

- Unit: assert `loginHandler` and invite-redemption Set-Cookie value contains
  `Max-Age=5184000`.
- Integration: assert `touchSession` is called once when middleware passes, and
  not called when the session is rejected. Use an in-memory KV; spy on
  `touchSession`.
- Integration: assert `findSession` reads use strong consistency (either by
  spying on the `get` options, or by simulating a race where eventual would fail
  and strong would succeed).
- E2E (Playwright): log in, clear the in-memory tab state (`page.reload()` after
  `context.clearCookies()` — no, that defeats the test; instead create a second
  `BrowserContext` that inherits the storage state, simulating Safari reloading
  after eviction), verify still authenticated on a protected page.

The E2E is the load-bearing one; it's what proves we fixed the user-visible
problem.

## Risks / Trade-offs

- **Risk:** A `Max-Age=60d` cookie that leaks (extension, shared device) remains
  valid for 60 days. → **Mitigation:** the server-side absolute timeout was
  always 60 days, so the risk envelope is unchanged; a logged-out user can still
  kill the cookie via `/logout`, which deletes the server-side row regardless of
  cookie state.
- **Risk:** Strong-consistency reads add latency at the median, not just the
  tail. → **Mitigation:** session reads happen once per authenticated request
  and the worst-case is a cross-region hop, not a database query. Acceptable for
  an app at our load.
- **Risk:** `touchSession`'s implicit per-hour write could double if two
  requests arrive within a millisecond. → **Mitigation:** the throttle is "if
  `now - lastSeen < TOUCH_THROTTLE_MS` skip". A read-modify-write race means two
  writes might both pass the throttle check; both writes are idempotent
  (`lastSeen = now`) and the last-write-wins. No correctness issue.
- **Risk:** Switching to a persistent cookie changes the perceived posture from
  "log in every time" to "logged in by default". → **Mitigation:** explicit
  `/logout` button remains and works as before. The spec already mandated the
  rolling idle window; we're aligning the cookie with the server-side promise
  the spec already made.

## Migration Plan

- No data migration. New cookies are emitted on next login; existing in-flight
  sessions continue to work and naturally renew on the next idle-check pass.
- No env vars added.
- Rollback: revert the PR. Existing persistent cookies remain valid for 60 days
  but degrade to non-persistent on the next login. No corruption risk.
