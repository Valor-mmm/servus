## Context

The current `consumeInvite(rawCode, username, password)` function creates a user
account from helper-supplied credentials and returns `ConsumeResult`. The caller
(the POST handler) then redirects to `/login` — the helper must log in
separately. This design inherits the risks of user-chosen passwords and adds
friction.

The replacement model: the invite code IS the one-time authentication token.
Scanning and confirming it creates a session in one step, exactly like a "magic
link" pattern.

## Goals / Non-Goals

**Goals:**

- Replace the registration form with a single confirmation button.
- Issue a session cookie immediately on code consumption; redirect to `/`.
- Store helpers as normal user records (same KV schema) but with an unknowable
  password hash — no login handler changes required.
- Keep full concurrency safety and code-burn atomicity.

**Non-Goals:**

- Cross-device re-authentication without a new invite.
- Optional username entry by the helper.
- Changing the primary user login flow in any way.

## Decisions

### D1 — Helper account username: `helper-{nanoid(8)}`

A short random identifier (`helper-a1b2c3d4`) is generated via
`crypto.getRandomValues`. It is stored as the username in KV and shown nowhere
in the UI — it is purely a lookup key. Using a recognisable prefix ("helper-")
makes KV records identifiable if an admin ever inspects raw data.

**Alternative considered**: using the first 8 chars of the invite ID — rejected
because invite IDs are UUIDs (too long, less readable) and the ID is deleted on
consumption.

### D2 — Helper password: discarded Argon2id hash

`hashPassword(crypto.randomUUID())` produces an Argon2id hash of a 36-char
random string that is immediately discarded. The login handler receives a real
Argon2id-encoded hash and calls `verifyPassword(hash, userInput)`, which will
always return `false` since nobody knows the preimage. No changes to
`loginHandler.ts` or `userRepo.ts`.

**Alternative considered**: `passwordHash: null` with a null-check in the login
handler — rejected because it requires changing the `User` type, the login
handler, and all type-check callers. The discarded-hash approach is a zero-diff
change to auth.

**Alternative considered**: a `kind: "helper"` flag — rejected for the same
reason; adds model complexity for a two-user app.

### D3 — Session creation in `consumeInvite`

`consumeInvite` is refactored to accept only `rawCode` and return
`ConsumeResult = { ok: true; cookie: string; csrfToken: string } | { ok: false; reason: … }`.
The handler sets `Set-Cookie` on the response and redirects to `/`. This keeps
all KV mutations (delete invite + create user + create session) in the same
function, making the atomicity boundary explicit even though the session write
is a separate KV transaction (session creation cannot be atomic with invite
deletion without a more complex design; the window between them is acceptable —
worst case, invite is deleted but session creation fails, and the code can no
longer be redeemed; admin mints new).

### D4 — Confirmation page (GET /invite/[code])

The GET handler validates the code (lookup by SHA-256 index) and renders a
single-button page — "Einladung annehmen" — if the code is valid. If the code is
invalid/expired it shows the existing error page. This prevents unintentional
activation by bots or link previewers making GET requests.

**Alternative considered**: auto-POST on GET (no button) — rejected because
crawlers and messaging apps issue GET requests when previewing URLs, which could
consume the one-time invite.

### D5 — Rate limiting

The existing per-IP invite rate limiter (`lib/invites/rateLimit.ts`) continues
to apply to POST requests. The cost is now lower (only a code lookup + session
creation vs. full Argon2id password hash), but the limiter remains in place to
prevent enumeration.

## Risks / Trade-offs

- **Cookie loss = locked out**: A helper who clears browser data or switches
  devices loses access and needs a new invite. For a short-lived house-move
  helper, this is acceptable. If it becomes a problem, a future change can add
  optional password setup post-session.
- **Session creation not atomic with invite deletion**: Between the invite KV
  delete and the session KV write, a crash would leave the invite consumed but
  no session. The helper would need a new invite. This is the same window that
  existed before (between account creation and redirect to /login). Risk: very
  low.
- **Username collisions**: `helper-{8 random chars}` from 36-char alphabet →
  ~2.8 trillion combinations; collision probability with 3 helpers is
  negligible. A retry loop on the `check({ key: userKey, versionstamp: null })`
  atomic check handles it correctly anyway.
