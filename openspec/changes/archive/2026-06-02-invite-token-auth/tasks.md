## 1. Refactor consumeInvite

- [x] 1.1 Update failing integration tests in
      `tests/integration/invites/register_test.ts` to reflect new
      `consumeInvite(rawCode)` signature (no username/password params; returns
      `{ ok: true; cookie: string; csrfToken: string } | { ok: false; reason }`)
- [x] 1.2 Refactor `lib/invites/index.ts`: `consumeInvite(rawCode)` generates a
      `helper-{8 random chars}` username, calls
      `hashPassword(crypto.randomUUID())` for a discarded hash, performs the
      atomic KV check (invite versionstamp + user non-existence), creates the
      user, deletes the invite, calls `createSession` and `signSessionId`,
      returns `{ ok: true; cookie; csrfToken }` or error

## 2. Update the public route

- [x] 2.1 Extend `checkAndIncrementInviteIp` in `lib/invites/rateLimit.ts` (or
      the route handler) to also fire on GET requests, so code-enumeration
      probes are throttled at the same 10/15 min per-IP threshold as POST
      attempts
- [x] 2.2 Rewrite `routes/invite/[code].tsx` GET handler: check rate limit first
      → validate code via `getInviteByCode` (SHA-256 lookup) → render
      confirmation page with a single "Einladung annehmen" button; show error
      page if code is invalid/expired or IP is rate-limited
- [x] 2.3 Rewrite POST handler: call `consumeInvite(rawCode)`; on success set
      `Set-Cookie` header and redirect 303 to `/`; on failure render error page
- [x] 2.4 Remove username/password fields from the route's JSX; remove
      `consumeInvite` result branch that redirected to `/login`

## 3. i18n

- [x] 3.1 Add/update German i18n keys in `lib/i18n/locales/de.ts`:
      `invite.confirm` ("Einladung annehmen"), `invite.confirm_subtitle`
      ("Klicke auf den Button, um deinen Zugang zu aktivieren."), remove or
      repurpose `invite.username_label`, `invite.password_label`,
      `invite.submit`, `invite.success` if no longer used anywhere

## 4. Validate and finalise

- [x] 4.1 Run `openspec validate` and fix any issues
- [x] 4.2 Playwright E2E: admin mints code → helper scans (navigates to) URL →
      clicks confirm → helper lands on `/` already authenticated → admin sees
      invite consumed (list empty)
