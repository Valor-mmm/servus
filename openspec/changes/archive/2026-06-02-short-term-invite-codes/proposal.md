## Why

The house move is imminent and temporary helpers will need access to servus to
help with packing and unpacking. Without an invite system, adding a helper
requires a code change to seed a new account — too slow and requires developer
access. An admin should be able to hand a helper a short-lived code that lets
them register their own password and immediately start working.

## What Changes

- Admin can generate single-use invite codes with a configurable expiry (default
  7 days).
- A public `/invite` route lets a code-holder register with a chosen password;
  consuming the code creates their account atomically and burns the code.
- Admin can view all outstanding (unused, not-yet-expired) codes and revoke any
  of them.
- Invite codes are stored hashed; raw codes are only shown once at creation
  time.
- Accounts created via invite are regular users (no admin privilege).

## Capabilities

### New Capabilities

- `invites`: Mint, list, revoke, and consume single-use time-limited invite
  codes that allow temporary helpers to self-register.

### Modified Capabilities

<!-- No existing spec-level requirements change. -->

## Non-goals

- Role granularity beyond admin vs. user.
- Email delivery of invite codes (admin shares the code out-of-band).
- Bulk invite creation.
- Password reset or account deletion via invite flow.

## Impact

- New `lib/invites/` module (types, KV operations, mint/consume/revoke logic).
- New routes: `GET/POST /admin/invites` (list + create),
  `POST /admin/invites/[id]/revoke`, `GET/POST /invite/[code]` (public
  registration page).
- New KV key pattern: `["invite", id]` primary +
  `["invite-by-expiry", expiry, id]` TTL-scan index.
- Auth module extended: account creation path shared between seed-from-env and
  invite consumption.
- No new external dependencies.
