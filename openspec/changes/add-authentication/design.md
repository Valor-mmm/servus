## Context

servus is a brand-new Fresh 2 application that must be auth-gated before it can
be deployed publicly. This is the first OpenSpec change, so this design also
locks in foundational patterns (KV repository layer, middleware composition,
crypto utilities) that later changes will build on.

The expected user population over the lifetime of the app is small (~2 primary
users, occasional short-lived invited helpers — at most a dozen distinct
identities ever). The threat model is correspondingly modest: an internet-facing
public URL exposed to opportunistic credential-stuffing and brute-force
attempts, not a targeted nation-state adversary.

## Goals / Non-Goals

**Goals:**

- Provide a hardened login flow that is safe to expose on the open internet.
- Be implementable in roughly 2–3 working days end-to-end (including tests).
- Keep all auth state in Deno KV — no extra service, no extra cost.
- Establish patterns the rest of the codebase will adopt (typed KV repos, TDD
  with in-memory KV, security-headers middleware, Playwright E2E shape).
- Make password-handling code small enough that a future reader can audit it in
  one sitting.

**Non-Goals:**

- Self-service password reset.
- Multi-factor authentication, OAuth, magic links.
- Invite codes (next change, `add-invite-codes`).
- Role-based authorization beyond the implicit "logged in or not". Roles arrive
  with later capabilities if ever.
- Sophisticated anti-abuse beyond per-IP and per-username rate limiting.
- Encryption of data at rest (Deno Deploy KV handles that for us).

## Decisions

### D1 — Argon2id for password hashing

**Choice:** Argon2id with cost parameters `m = 64 MiB, t = 3, p = 1`, 16-byte
random salt, encoded in the standard `$argon2id$...` PHC string.

**Alternatives considered:**

- _bcrypt_: well-known but capped at 72 bytes and not memory-hard.
- _scrypt_: memory-hard but Argon2id is the modern OWASP recommendation.
- _PBKDF2 (in stdlib `node:crypto` shim)_: avoids a dependency but is far weaker
  per CPU-second than Argon2id and is no longer recommended for new systems.

**Rationale:** OWASP "Password Storage Cheat Sheet" recommends Argon2id first.
The cost parameters target ~0.5s on Deno Deploy's free worker, which is
comfortable for a login endpoint and painful for an attacker. We will measure
during implementation and adjust if Deno Deploy's free tier is slower than
expected (parameters live in one constant, easy to tune).

**Dependency choice:** prefer `@stdext/crypto` or `@hexagon/argon2` if either
has a stable, maintained WASM build at implementation time; otherwise vendor the
reference WASM. The library is pinned by exact version in `deno.json`.

### D2 — Server-side sessions, not JWTs

**Choice:** Generate a 32-byte opaque session ID via `crypto.getRandomValues`,
store the session record in KV at `["session", id]`, send the ID in a signed
HttpOnly cookie.

**Alternatives considered:**

- _JWT (signed token, no server-side state)_: appealing simplicity but
  revocation is hard (we'd need a blocklist anyway), and JWT pitfalls (alg=none,
  weak signing, expiry sloppiness) are exactly the kind of footgun this project
  is trying to avoid.
- _Encrypted stateless cookie (à la Iron Session)_: nicer than JWT but still no
  native revocation.

**Rationale:** Server-side sessions in KV give us immediate revocation
(`kv.delete`), simple rotation, and a place to record `lastSeen`. Cookie carries
the ID + HMAC-SHA256 signature to make tampering cheap to detect. Cost: one
extra KV read per request — well within free-tier budgets.

### D3 — Cookie attributes

`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, no explicit `Domain`
(host-only cookie for `servus.valor.codes`).

`SameSite=Strict` is acceptable because the app is a single origin with no
cross-site flows (no OAuth callbacks, no embedded widgets). It blocks CSRF from
top-level navigations, which is a strong baseline before our CSRF tokens take
over for explicit form/POST flows.

### D4 — Session lifetime

Idle timeout: 14 days. Absolute timeout: 60 days. On every authenticated request
we update `lastSeen` (throttled to once per hour to avoid write amplification)
and reject sessions whose `lastSeen` is older than 14 days or whose `createdAt`
is older than 60 days.

A KV TTL on the session record (set to absolute timeout from creation) acts as a
backstop garbage collector.

### D5 — Rate limiting and lockout

Two independent counters in KV:

- `["rate", "ip", <hashedIp>]` → count of failed logins from this IP in a
  sliding 15-minute window. Threshold: 10. Penalty: 429 with `Retry-After`.
- `["rate", "user", <username>]` → count of failed logins for this username in a
  sliding 1-hour window. Threshold: 5. Penalty: exponential backoff returned
  via 429.

Both counters reset on successful login _for that key_. We hash IPs
(SHA-256(`SERVUS_SESSION_KEY` ‖ ip)) so a database leak doesn't expose raw IPs.

**Constant-time response:** the login handler always performs a password hash
(against a fixed dummy hash if the user is unknown) and waits for both
rate-limit checks before responding. This avoids leaking timing information
about whether a username exists.

### D6 — CSRF tokens

For every session, generate a per-session CSRF token (32 bytes, random) and
store it alongside the session record. Mutation routes (POST/PUT/PATCH/DELETE)
require the token in a header (`x-csrf-token`) or hidden form field. The token
is exposed to the page via a `<meta>` tag in the layout so server-rendered forms
can include it.

Cookie's `SameSite=Strict` already blocks most cross-origin CSRF, but defense in
depth is cheap here.

### D7 — Security headers middleware

Applied globally as the outermost middleware:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:;
  style-src 'self' 'unsafe-inline';  -- Fresh's island hydration uses inline style boots
  script-src 'self';
  object-src 'none'; base-uri 'self'; frame-ancestors 'none';
  form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Permissions-Policy: camera=(self), geolocation=(), microphone=()
```

Camera permission stays open because future image-capture (M6) uses it.

### D8 — Seeded users

On every boot the app reads `SERVUS_SEED_USERS` (a JSON array of
`{username, password}` pairs). For each pair, if no user with that username
exists in KV, create one with the password hashed at boot. Existing users are
left untouched (we never overwrite a real hash with whatever is in the env).

A boot log line announces `seeded N user(s), skipped M existing`. The seed env
var is allowed to be empty in CI test runs.

**Production usernames: `monster` and `maus`.** These are the two permanent
household users. Passwords are set via `SERVUS_SEED_USERS` in the Deno Deploy
environment — never committed to source.

### D11 — Internationalisation (i18n)

The UI is German. Rather than inlining German strings in components, all UI copy
goes through a thin `t(key)` function backed by a locale file. This keeps
components readable regardless of the display language and makes future language
additions a locales-only change.

**Approach: static German locale, zero runtime deps.**

- `lib/i18n/locales/de.ts` — TypeScript object with all German string literals.
- `lib/i18n/t.ts` —
  `t(key: keyof typeof de, params?: Record<string, string>): string` does a
  simple keyed lookup with optional string interpolation. No external library.
- All Fresh route files and components import `t` and use it exclusively for
  copy. No inline German (or English) strings in JSX/TSX.
- If a second locale is added later, a locale resolver reads a cookie or
  `Accept-Language` header and swaps the backing object; no component changes.

This is part of **M0 foundation**, not this auth change — the `t()` function
must exist before the login form template is written. The auth tasks confirm it
is present in step 1.1 and use it in step 5.3.

### D9 — KV layout

```
["user", <username>]               → { username, passwordHash, createdAt }
["session", <sessionId>]           → { sessionId, username, createdAt, lastSeen, csrfToken }
["session-by-user", <username>, <sessionId>] → null     -- index for "log out everywhere"
["rate", "ip", <hashedIp>]         → { count, windowStart }  (TTL ~15 min)
["rate", "user", <username>]       → { count, firstFailAt }  (TTL ~1 hour)
```

Username is a stable natural key — we never delete or rename users in MVP. If we
ever need that, a `userId` field gets introduced and `["user", username]`
becomes a pointer.

### D10 — Foundation deferral

The foundation (`deno.json`, Fresh 2 skeleton, GitHub Actions pipeline,
deployment to `servus.valor.codes`, Playwright bootstrap, `lib/i18n/` scaffold,
Renovate config) is set up as plain code _before_ applying this change. It is
not itself an OpenSpec change because it adds no user-visible capability. The
first task in this change's `tasks.md` confirms the foundation is in place.

## Risks / Trade-offs

- **Argon2id WASM startup cost.** Loading the WASM module on a cold start adds
  latency. → _Mitigation_: warm path on app boot; the cost shows up at deploy
  rollover, not at every login.
- **Free-tier worker CPU is shared.** Argon2id with `m=64MiB, t=3` may take
  > 1s under contention on Deno Deploy's free tier. → _Mitigation_: cost
  > parameters live in one constant; measure under realistic load and adjust.
  > Falling back to `m=32MiB, t=2` still meets OWASP minimums.
- **KV write amplification for `lastSeen` updates.** Updating `lastSeen` on
  every request would consume the free-tier write quota fast. → _Mitigation_:
  throttle to once per hour per session.
- **No password reset means a forgotten password requires a redeploy with a new
  seed.** Acceptable for 2 users; revisit with `add-invite-codes` or later. →
  _Mitigation_: documented in README.
- **Argon2id library risk.** If the chosen library goes unmaintained, we lose
  upstream security fixes. → _Mitigation_: pinned by version, small enough to
  vendor, library code is in scope for a security review at integration time.
- **CSP `style-src 'unsafe-inline'`.** Fresh hydration scripts and island boot
  styles may require it. → _Mitigation_: try without first; tighten via nonces
  if Fresh 2 supports them at integration time.

## Migration Plan

- This is a greenfield change; there is no existing auth to migrate from.
- Deployment order: foundation merged → secrets set on Deno Deploy
  (`SERVUS_SESSION_KEY`, `SERVUS_SEED_USERS`) → this change merged → manual
  smoke test on `servus.valor.codes`.
- Rollback: revert the merge commit and redeploy. Sessions in KV become orphaned
  and self-expire via TTL; no data corruption risk.

## Open Questions

- Exact two seeded usernames (you + your wife). Needed before deploy, not before
  merge.
- Whether to expose a "log me out everywhere" affordance in this change or defer
  to a settings page later. _Default: defer_; the index is in place so it's
  cheap to add later.
- Decide the Argon2id library choice during implementation. The decision will be
  recorded in a one-paragraph `docs/decisions/argon2-library.md`.
