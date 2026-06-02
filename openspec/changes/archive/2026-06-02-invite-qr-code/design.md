## Context

After minting an invite, the admin sees a one-time banner with the raw invite
URL. Helpers are likely on mobile; scanning a QR code is faster and less
error-prone than typing or copy-pasting a 40+ character URL. The QR code must be
generated server-side (no islands, no client JS) because the banner is rendered
in a single POST response and must not be re-fetchable.

## Goals / Non-Goals

**Goals:**

- Render a QR code for the invite URL in the one-time banner, server-side, on
  the POST response.
- Keep the implementation to a single new import and minimal markup changes.

**Non-Goals:**

- QR codes on the invite _list_ (only the one-time creation banner).
- Client-side QR regeneration or downloading.
- QR codes anywhere else in the app (box labels already have their own page).

## Decisions

### D1 — Library: `npm:qrcode` as SVG string

**Choice**: Import `qrcode` from npm, call
`QRCode.toString(url, { type: "svg" })` to get an inline SVG string, inject it
via `dangerouslySetInnerHTML`.

**Why**: The library is pure JS, has no native/canvas dependency, works in Deno
without any build step, and produces a clean SVG that scales perfectly on any
screen. The npm specifier is already supported by Deno Deploy.

**Alternative considered**: `npm:qrcode-svg` — smaller but no active maintenance
since 2020; `npm:qr-image` — PNG buffer, would require a `<img src="data:...">`
approach which works but SVG is simpler and crisper. A from-scratch
implementation in `lib/` was considered but the QR spec is complex
(Reed-Solomon, masking) and not worth owning.

### D2 — Injection via `dangerouslySetInnerHTML`

The SVG string returned by `qrcode` is trusted (generated server-side from our
own URL, no user content is embedded in the QR payload beyond the invite code
which is already validated). Using
`dangerouslySetInnerHTML={{ __html: svgString }}` on a wrapping `<div>` is the
correct Fresh/Preact pattern for injecting trusted SVG markup.

### D3 — Placement in the banner

The QR code sits below the URL text inside the existing `.invite-code-banner`
div. No new CSS class needed; the banner already has centered layout. A brief
`aria-label` (from i18n) is added to the wrapper div for screen readers.

## Risks / Trade-offs

- **`npm:` specifier on Deno Deploy**: npm specifiers are fully supported on
  Deno Deploy since mid-2023. Risk: low.
- **SVG injection XSS**: The QR payload is the invite URL, which is constructed
  from our own origin + a random base64url code. No user-controlled string
  enters the QR payload. Risk: negligible.
- **`deno check` with npm**: The `qrcode` package ships CommonJS types; a
  `@types/qrcode` deno-compatible shim may be needed. Mitigation: add
  `@types/qrcode` to `deno.json` imports or use `// @ts-ignore` if types cause
  issues with `deno check`.
