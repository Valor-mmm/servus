## 1. Dependency and wiring

- [x] 1.1 Add `npm:qrcode` and `npm:@types/qrcode` to `deno.json` imports
- [x] 1.2 Create `lib/invites/qr.ts`: export
      `generateQrSvg(url: string): Promise<string>` wrapping
      `QRCode.toString(url, { type: "svg" })`

## 2. Banner update

- [x] 2.1 Write a unit test for `generateQrSvg` asserting the return value
      contains `<svg` and encodes the URL
- [x] 2.2 Update `routes/admin/invites/index.tsx`: call
      `generateQrSvg(inviteUrl)` in the POST handler and pass the SVG string to
      the banner component
- [x] 2.3 Add a
      `<div class="invite-qr" aria-label={t("invites.qr_label")}
      dangerouslySetInnerHTML={{ __html: qrSvg }} />`
      below the `.invite-url` element in the banner markup
- [x] 2.4 Add German i18n key `invites.qr_label` ("QR-Code für Einladungslink")
      to `lib/i18n/locales/de.ts`

## 3. Validate and finalise

- [x] 3.1 Run `openspec validate` and fix any issues
- [x] 3.2 Playwright E2E: admin mints invite → `.invite-qr svg` is visible in
      the banner
