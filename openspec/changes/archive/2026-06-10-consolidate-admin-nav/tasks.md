## 1. Replace `/admin/invites` with a redirect

- [x] 1.1 Replace `routes/admin/invites/index.tsx` entirely with a handler that
      returns a 302 redirect to `/admin` for both GET and POST requests (POST is
      no longer handled here — creation moves to `/admin`)

## 2. Update revoke redirect target

- [x] 2.1 Update `routes/admin/invites/[id]/revoke.ts`: change the redirect
      after a successful revoke from `/admin/invites` to `/admin`

## 3. Expand `/admin` page with invite section

- [x] 3.1 Add `nav.admin` German copy to `lib/i18n/locales/de.ts` (e.g.
      "Verwaltung")
- [x] 3.2 Expand `routes/admin/index.tsx` to handle invite creation POST: add a
      `POST` handler that reads `_action=create_invite` and `expiry_days` from
      the form, calls `mintInvite(expiryDays)`, generates the QR SVG via
      `generateQrSvg`, then renders the admin page inline (same as GET) with
      `newInviteUrl` and `qrSvg` set — no redirect needed, so the raw code never
      appears in the browser address bar or history. Also expand the GET handler
      to load outstanding invites via `listOutstandingInvites()` and pass them
      to the render.

- [x] 3.3 Add the invite section UI to the `AdminPage` component in
      `routes/admin/index.tsx`: - One-time invite URL + QR banner (shown only
      when `newInviteUrl` is set), reusing `invite-code-banner`,
      `invite-warning`, `invite-url`, `invite-qr` CSS classes from the existing
      invite page - Create form: expiry days input + submit button, POSTing to
      `/admin/invites` - List of outstanding invites: expiry date, revoke form
      per invite (POSTing to `/admin/invites/<id>/revoke`) - Empty state when no
      outstanding invites exist

## 4. Update navigation

- [x] 4.1 Update `routes/_app.tsx`: replace the `/admin/invites` nav link and
      `invites.nav` i18n key with `/admin` and `nav.admin`; update the
      `navActive` call to match `/admin` (active for any path starting with
      `/admin`)

## 5. Update specs

- [x] 5.1 Update `openspec/specs/invites/spec.md`: change references to
      `/admin/invites` as the invite management UI location to `/admin`; the
      functional scenarios (create, list, revoke, one-time display) are
      unchanged

## 6. E2E coverage

- [x] 6.1 Update `tests/e2e/export_import.spec.ts`: update any nav interaction
      that clicks the admin nav link to expect `/admin` (not `/admin/invites`)
- [x] 6.2 Update or add Playwright scenario in `tests/e2e/invites.spec.ts`
      (create if it doesn't exist): navigate to `/admin` via the nav link,
      create an invite, verify the one-time code banner appears on `/admin`,
      navigate away and back and confirm the banner is gone, revoke an invite
      and confirm it disappears from the list — all within `/admin`
