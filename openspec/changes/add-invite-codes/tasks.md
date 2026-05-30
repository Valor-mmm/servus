## 1. Types and KV repository

- [ ] 1.1 Add `InviteCode` interface to `lib/auth/types.ts`: fields `hash`
      (SHA-256 hex), `createdAt`, `expiresAt`, `note` (string | null),
      `consumed` (boolean)
- [ ] 1.2 Create `lib/auth/inviteRepo.ts`:
  - `mintInvite(note?)` — generate 16 random bytes, compute SHA-256 hex hash,
    atomically write `["invite", hash]` + `["invite-list", createdAt, hash]`,
    return plain token + `InviteCode`
  - `findInvite(token)` — hash the token, look up `["invite", hash]`
  - `listInvites()` — prefix-scan `["invite-list"]`, resolve each to its
    `InviteCode` record
  - `revokeInvite(hash)` — atomically delete `["invite", hash]` +
    `["invite-list", createdAt, hash]`
  - `burnInvite(hash, versionstamp)` — atomic check + delete both keys (used
    during registration)

## 2. Middleware update

- [ ] 2.1 Add `/register` to `PUBLIC_PATHS` in `lib/auth/middleware.ts`

## 3. Registration route

- [ ] 3.1 Create `routes/register.tsx`:
  - GET: hash the `?code=` param, look up invite, reject if missing / expired /
    consumed; render registration form with hidden token field
  - POST: re-validate token, check username not empty and password ≥ 8 chars,
    call `hashPassword`, then atomically `burnInvite` + `createUser`; redirect
    to `/login` on success; render form with error on any failure (duplicate
    username, bad token, etc.)

## 4. Invites management route

- [ ] 4.1 Create `routes/invites/index.tsx`:
  - GET: call `listInvites()`, render list with creation date, expiry, note,
    consumed status, and revoke button for each; include mint form at top
  - POST `_action=mint`: call `mintInvite(note)`, re-render page showing the
    plain registration URL once (via query param `?minted=<token>`)
  - POST `_action=revoke`: call `revokeInvite(hash)`, redirect back to
    `/invites`

## 5. i18n strings

- [ ] 5.1 Add to `lib/i18n/locales/de.ts`: `invites.title`,
      `invites.mint_label`, `invites.note_placeholder`, `invites.mint_submit`,
      `invites.empty`, `invites.revoke`, `invites.code_label`,
      `invites.expires_label`, `invites.expired_badge`,
      `invites.register_title`, `invites.username_label`,
      `invites.password_label`, `invites.register_submit`,
      `invites.invalid_code`, `invites.expired_code`,
      `invites.register_success`, `invites.username_taken`,
      `invites.password_too_short`, `invites.url_label`
- [ ] 5.2 Add link to `/invites` in both nav bars in `routes/_app.tsx` (desktop
      top-nav and mobile bottom-nav)

## 6. Unit tests

- [ ] 6.1 `tests/unit/auth/inviteRepo_test.ts`:
  - mintInvite creates record with hash, expiresAt ~7 days out, consumed=false
  - findInvite returns record for valid token, null for unknown token
  - revokeInvite removes the record; subsequent findInvite returns null
  - burnInvite removes the record atomically

## 7. Integration tests

- [ ] 7.1 `tests/integration/auth/inviteRepo_integration_test.ts`:
  - Full mint → find → burn cycle against real KV
  - Expired invite (expiresAt in the past) is returned by findInvite but
    registration handler rejects it
  - listInvites returns all non-burned invites in creation order

## 8. E2E tests

- [ ] 8.1 `tests/e2e/invites.test.ts`:
  - Admin mints a code → registration URL appears on page
  - New user opens the URL, fills in username + password, submits → redirected
    to login
  - New user logs in with the registered credentials → authenticated session
  - Admin revisits `/invites` → code no longer listed (consumed)
  - Admin mints a second code and revokes it → code gone from list
  - Attempting to register with the revoked code shows an error
