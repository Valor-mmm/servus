## Why

Helpers receiving an invite will likely be on mobile and copy-pasting a long URL
is awkward. A QR code displayed alongside the invite link lets them scan it
instantly with their phone camera.

## What Changes

- The invite-code banner on `POST /admin/invites` (the one-time display after
  minting a code) gains a QR code image rendered server-side directly below the
  invite URL.
- No new routes, no new KV keys, no change to the invite data model.

## Capabilities

### New Capabilities

_(none — this is a pure UI addition to an existing flow)_

### Modified Capabilities

- `invites`: The one-time code-display banner now MUST include a scannable QR
  code image for the invite URL in addition to the plain-text link.

## Impact

- **New dependency**: a QR-code generation library. Must be zero-build,
  Deno-compatible, and produce an SVG or PNG inline — no canvas/DOM required.
  `qrcode` from npm (`npm:qrcode`) fits: stable (no major bump in 2+ years),
  small surface, pure JS.
- **Affected files**: `routes/admin/invites/index.tsx` (banner markup + QR
  rendering), `lib/i18n/locales/de.ts` (alt-text key), `deno.json` (new import).
- **No breaking changes** to data model, routes, or auth.

## Non-goals

- QR codes for box labels are out of scope here (boxes already have their own
  label page).
- QR codes are not added to the invite _list_ — only the one-time banner.
- No client-side QR regeneration; the code is rendered server-side on the POST
  response.
