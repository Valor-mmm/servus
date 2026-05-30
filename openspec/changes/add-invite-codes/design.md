## Context

Users are currently created only via `SERVUS_SEED_USERS` on boot — a deliberate
simplification for a two-primary-user app. For the move, we anticipate needing
1–3 short-lived helpers. Adding them via env-var + redeploy is friction-heavy
and leaves stale accounts indefinitely. A lightweight invite-code flow gives the
admin runtime control without external auth infrastructure.

The app already has `lib/auth/userRepo.ts` with `createUser` and all the
Argon2id hashing infrastructure from M1. The invite feature slots in alongside
it with minimal new surface.

## Goals / Non-Goals

**Goals:**

- Admin can generate a single-use code and hand the URL to a helper.
- Code is cryptographically random, stored only as a hash (never in plain text
  after display).
- Registration atomically burns the code and creates the user — no partial state
  possible.
- Expired or revoked codes are rejected gracefully.
- Admin has a clear list of outstanding codes and can revoke any at any time.

**Non-Goals:**

- Role system — all users are equal after registration.
- Email delivery, SMS, or any notification mechanism.
- Self-service account deletion or password reset for invited users.
- Bulk invite minting.

## Decisions

### D1: Token = 128-bit random bytes, stored as SHA-256 hex hash

**Choice**: Generate 16 bytes via `crypto.getRandomValues`, encode as hex for
the URL token; store only `SHA-256(token)` in KV.

**Rationale**: 128 bits is the NIST recommendation for single-use tokens.
Storing only the hash means a KV breach doesn't expose usable tokens. SHA-256 is
fast enough for this low-throughput operation and is available as a first-class
Web Crypto API in Deno — no dependency needed.

**Alternatives considered**: UUID v4 (only ~122 bits, and string comparison
rather than hash comparison); HMAC-signed token (unnecessary complexity — the
hash approach is sufficient and simpler to verify).

---

### D2: KV layout — primary key on hash, list via prefix scan

**Choice**:

- Primary: `["invite", hash]` → `InviteCode` value
- List index: `["invite-list", createdAt, hash]` → `null` (for time-ordered
  listing)

**Rationale**: The registration path looks up by hash directly (O(1)); the admin
list scans the `"invite-list"` prefix in creation order. Two keys per invite,
both written atomically on mint.

**Alternatives considered**: Storing a list in a single KV value (breaks atomic
updates, limited size); using the token itself as the primary key (never store
the plain token server-side — violates D1).

---

### D3: Registration route is public; admin route is protected

**Choice**: `/register` added to `PUBLIC_PATHS` in the auth middleware so it is
reachable without a session. `/invites` is a normal protected route accessible
only to authenticated (admin) users.

**Rationale**: The invite consumer by definition does not have an account yet.
The admin management page requires an existing session — consistent with all
other admin-only routes.

**Security note**: The token is transmitted as a URL query parameter over HTTPS
only. It is not logged (the middleware already strips query params from logs via
Deno Deploy). The token is treated as a credential and never echoed back after
the initial display.

---

### D4: Atomic burn-and-create at registration

**Choice**: A single `kv.atomic()` that checks the invite record's versionstamp,
deletes both invite KV keys, and calls `createUser` (also atomic) in sequence —
if any step fails the whole operation rolls back.

**Rationale**: Prevents double-registration (two concurrent requests with the
same code). Prevents a user being created without the code being consumed (or
vice versa). Deno KV's `atomic().check()` makes this straightforward.

**Edge case**: `createUser` itself uses an atomic check on `null` versionstamp —
if the username already exists it throws. The registration handler catches this
and returns a validation error without burning the code.

---

### D5: 7-day expiry enforced at consumption, not via TTL

**Choice**: Store `expiresAt: number` in the invite record; check
`Date.now() >
expiresAt` at registration time and on the admin list view. Do not
use Deno KV's built-in TTL.

**Rationale**: Deno KV TTL silently deletes the record; the admin would have no
visibility that an expired code was ever issued. Keeping the record with an
`expired` state lets the admin list show "expired" codes until they are
explicitly revoked/cleaned up. Also avoids the KV TTL's ~1 hour granularity for
time-critical cases.

## Risks / Trade-offs

- **Token in URL is visible in browser history and server logs** → Tokens are
  single-use and expire in 7 days; exposure window is short. HTTPS prevents
  network interception. Admin should instruct helpers to register promptly and
  not share the link.
- **No rate-limit on `/register`** → The registration form is gated behind a
  valid token hash lookup; brute-forcing a 128-bit space is computationally
  infeasible. A per-IP rate limit can be added later if needed.
- **Invited users have full admin capabilities** → Acceptable for the move
  scenario (1–3 helpers with trusted access). Role granularity is a non-goal and
  can be added in a future change.
- **Expired codes remain in KV until manually revoked** → Low data volume (tens
  of invites at most); no cleanup job needed for this scale.

## Migration Plan

1. Add `InviteCode` type to `lib/auth/types.ts`.
2. Implement `lib/auth/inviteRepo.ts` (mint, find, list, revoke, burn).
3. Add `/register` to `PUBLIC_PATHS` in middleware.
4. Build `routes/register.tsx` (GET shows form, POST validates + burns + creates
   user + redirects to login).
5. Build `routes/invites/index.tsx` (GET lists outstanding codes, POST mints or
   revokes).
6. Add i18n strings.
7. Unit + integration tests for inviteRepo.
8. E2E test for the full mint → register flow.

No KV schema migration. No existing routes change behavior. Rollback is removing
the new files and the `PUBLIC_PATHS` entry.

## Open Questions

- _(none — scope is fully defined by the roadmap)_
