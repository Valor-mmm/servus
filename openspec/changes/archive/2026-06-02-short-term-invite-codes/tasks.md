## 1. Domain types and KV layer

- [x] 1.1 Define `Invite` type in `lib/invites/types.ts` (id, hashedCode,
      expiry, createdAt, status)
- [x] 1.2 Write failing unit tests for KV operations: create, getById,
      listOutstanding, deleteById
- [x] 1.3 Implement `lib/invites/kv.ts`: primary `["invite", id]` + expiry-index
      `["invite-by-expiry", isoExpiry, id]`; atomic writes

## 2. Invite business logic

- [x] 2.1 Write failing unit tests for code generation (≥ 128 bits, base64url,
      never stored raw)
- [x] 2.2 Implement `lib/invites/generate.ts`: `generateInviteCode()` → raw
      code + hash pair using `crypto.getRandomValues` + Argon2id
- [x] 2.3 Write failing unit tests for `mintInvite`, `revokeInvite`, and
      `consumeInvite`
- [x] 2.4 Implement `lib/invites/index.ts`: `mintInvite(expireDays)`,
      `revokeInvite(id)`, `consumeInvite(rawCode, username, password)` with
      atomic KV check

## 3. Rate-limiting extension

- [x] 3.1 Write failing unit tests for invite-route rate-limiting (per-IP)
- [x] 3.2 Extend `lib/auth/rateLimit.ts` (or create `lib/invites/rateLimit.ts`)
      to cover the `/invite` endpoint

## 4. Admin invite management routes

- [x] 4.1 Write failing integration tests for `GET /admin/invites` (list
      outstanding, exclude expired)
- [x] 4.2 Implement `routes/admin/invites/index.tsx`: list outstanding invites,
      show masked code + expiry
- [x] 4.3 Write failing integration tests for `POST /admin/invites` (create;
      returns raw code once)
- [x] 4.4 Implement `POST /admin/invites` handler: mint invite, display raw code
      with "copy now" warning
- [x] 4.5 Write failing integration tests for `POST /admin/invites/[id]/revoke`
- [x] 4.6 Implement `routes/admin/invites/[id]/revoke.tsx` (form-post handler →
      delete invite → redirect)
- [x] 4.7 Add invite management link to admin navigation

## 5. Public registration route

- [x] 5.1 Write failing integration tests for `GET /invite/[code]` (valid,
      expired, already-used)
- [x] 5.2 Implement `routes/invite/[code].tsx`: registration form (username +
      password fields)
- [x] 5.3 Write failing integration tests for `POST /invite/[code]` (success,
      expired, used, concurrent)
- [x] 5.4 Implement `POST /invite/[code]` handler: validate code, create account
      (role: user), burn code atomically, redirect to login
- [x] 5.5 Apply IP rate-limiting middleware to the registration route
- [x] 5.6 Add German i18n strings for all invite-flow copy to
      `lib/i18n/locales/de.ts`

## 6. Validate and finalise

- [x] 6.1 Run `openspec validate` and fix any issues
- [x] 6.2 Playwright E2E: admin mints code → helper registers via code → helper
      logs in → invite no longer listed
