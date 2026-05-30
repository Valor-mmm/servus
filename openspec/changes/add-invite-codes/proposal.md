## Why

The two primary users are seeded via env vars, but the upcoming move may need
short-lived helpers (family members, movers) who can view and update inventory
without a code change or redeployment. Invite codes let an admin mint a
single-use registration link and hand it to a helper; the code self-expires and
is burned on use, so no cleanup is required afterward.

## What Changes

- **Invite entity** — a single-use code record: raw token (≥ 128 bits,
  `crypto.getRandomValues`), stored as a SHA-256 hex hash, expiry timestamp,
  optional note, and consumed flag.
- **Admin: mint invite** — admin-only form on `/invites` to generate and display
  a new invite code (shown once in full; stored only as hash).
- **Admin: list and revoke invites** — `/invites` lists outstanding (unexpired,
  unconsumed) codes with their expiry and optional note; admin can revoke any.
- **Registration via code** — `/register?code=<token>` public page: validates
  the token against stored hashes, lets the new user choose a username and
  password, burns the code and creates the user atomically.
- **Expiry** — codes expire 7 days from issuance by default. Expired codes are
  rejected at registration time; a background check on the invite list filters
  them from display.

## Capabilities

### New Capabilities

- `invites`: mint, list, revoke, and consume single-use invite codes that create
  new user accounts.

### Modified Capabilities

- `auth`: add user-creation-via-invite-code path. The existing seeded-user
  provisioning requirement is unchanged; this adds a second way to create users
  at runtime.

## Impact

- New `lib/auth/inviteRepo.ts` — KV CRUD for invite records.
- New `routes/invites/index.tsx` — admin invite management page (mint + list +
  revoke); protected behind auth middleware.
- New `routes/register.tsx` — public registration page; bypasses auth middleware
  but validates invite token.
- `lib/auth/middleware.ts` — add `/register` to `PUBLIC_PATHS`.
- `lib/i18n/locales/de.ts` — new strings for invite UI.
- `lib/auth/types.ts` — new `InviteCode` interface.
- No schema migrations; KV is schemaless.
- No new runtime dependencies. SHA-256 via `crypto.subtle` (Web Crypto API,
  already available in Deno).

## Non-goals

- Role granularity beyond admin/user — all accounts have identical permissions.
- Email delivery of invite links — admin copies and sends the URL manually.
- Invite acceptance rate tracking or analytics.
- Invite code renewal — expired codes must be revoked and a new one minted.
