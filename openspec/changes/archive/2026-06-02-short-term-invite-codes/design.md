## Context

The app currently has no self-registration path. Admin accounts are seeded from
env vars at boot. During the move, the admin needs to hand temporary helpers a
code they can use to register their own password and start working immediately —
without requiring the admin to push code or manually create an account via the
server.

The existing auth module (`lib/auth/`) handles password hashing (Argon2id),
session creation, and rate-limiting. Invite consumption must reuse the same
account-creation path to stay consistent and avoid duplicating security logic.

## Goals / Non-Goals

**Goals:**

- Admin can generate a random invite code, see it once, and share it
  out-of-band.
- Code-holder can self-register by visiting a public URL and choosing a
  password.
- Code is burned atomically when the account is created.
- Admin can list all outstanding codes and revoke any of them before they
  expire.
- Expired codes are automatically treated as invalid (no registration possible).

**Non-Goals:**

- Email delivery, SMS, or any automated code distribution.
- Role granularity beyond admin vs. regular user.
- Bulk invite creation.
- Account deletion or password reset.

## Decisions

### D1. Code generation: `crypto.getRandomValues` → base64url, ≥ 128 bits

A 20-byte random value encoded as base64url gives ~160 bits of entropy (~27
URL-safe characters). No external dependency needed — Deno's Web Crypto API
covers this. The raw code is shown once to the admin in the creation response;
only the Argon2id hash is stored (same threat model as passwords: a KV dump
should not expose usable codes).

Alternative considered: shorter human-typeable codes (8 hex chars). Rejected
because ≥ 128 bits is the project's stated requirement and admins share the code
via a link anyway.

### D2. Storage: `["invite", id]` primary + `["invite-by-expiry", isoExpiry, id]` index

Primary key allows O(1) lookup during consumption. The expiry index allows the
admin list to be sorted by expiry date without scanning all invites. Expired
entries are filtered at read time rather than deleted eagerly (consistent with
how sessions work in the existing auth module).

Alternative: a single list with no index. Rejected because scanning all invites
for expiry filtering would be wasteful as the list grows during the move.

### D3. Consume flow: optimistic atomicCheck then create-user + delete-invite

Consumption must be atomic: if account creation fails, the invite must not be
burned. Deno KV's `kv.atomic()` supports a `check()` guard: verify the invite
record exists and has the expected versionstamp, then create the user and delete
the invite in one commit. If a concurrent request consumed the same code first,
the check fails and the second request sees "code not found".

### D4. Registration page is public (unauthenticated) but rate-limited

The `/invite/[code]` route must be reachable without a session so helpers can
register before their first login. Rate-limit by IP (same mechanism as the login
endpoint) to prevent brute-force guessing of codes. Because codes are ≥ 128 bits
the practical enumeration risk is negligible, but rate-limiting is cheap and
consistent with existing policy.

### D5. Admin routes under `/admin/invites`; no separate API

Consistent with the rest of the app — routes are thin, business logic lives in
`lib/invites/`. The admin list page and the create/revoke actions are form
submissions returning redirects (no JSON API).

## Risks / Trade-offs

- **One-time display of raw code** → If the admin closes the page before copying
  the code, it's lost and they must revoke and create a new one. Mitigation: UI
  clearly states "copy this code now — it won't be shown again."
- **No expiry cleanup job** → Expired invites accumulate in KV. At move scale (<
  10 helpers) this is negligible. A future cleanup task can scan the expiry
  index and delete stale records.
- **Rate-limit state in memory only** → The existing rate-limiter is in-process.
  For a single-instance Deno Deploy app this is acceptable; a future
  multi-region deploy would need a KV-backed limiter. Not a concern for MVP.
