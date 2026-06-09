## Why

The servus app already ships a `manifest.json` with `display: standalone` and
links to it from `<head>`, so the browser sees a PWA intent — but it does not
satisfy Chrome's and Firefox's installability criteria. The two missing pieces
are a proper icon set (the manifest currently references only `favicon.ico`,
which is below the minimum required size) and a service worker (required by
Chrome for the "Add to Home Screen" prompt).

Both permanent users are on Android, using the app daily during an imminent
house move. Removing browser chrome and adding a home screen icon makes the
experience feel native and reduces friction when scanning box QR codes. The
offline fallback turns a blank browser error into a recognisable, on-brand
screen.

## What Changes

User-visible:

- Chrome and Firefox on Android now present an "Add to Home Screen" prompt or
  install option.
- Once installed, the app opens in standalone mode (no browser URL bar) with the
  servus lion-and-shield as the home screen icon.
- On launchers that apply a circular or squircle mask, the icon uses the
  maskable variant: the shield is centred in a parchment-coloured safe zone so
  nothing important is clipped.
- If the network drops during navigation, the user sees a branded offline page
  instead of a generic browser error. The page shows the lion, Bavarian flavour
  text, and a reload button.

Internal:

- `static/lion-maskable.svg` added: the existing shield centred at ~60% of a
  parchment-filled 100×100 canvas. No image-processing tooling needed.
- `static/manifest.json` updated: the `favicon.ico` icon entry is replaced with
  two SVG entries (`"purpose": "any"` and `"purpose": "maskable"`).
- `static/sw.js` added: a minimal service worker — cache-first for the app
  shell, network-first for navigation, offline fallback to `offline.html`.
- `static/offline.html` added: a self-contained static page sharing `styles.css`
  shown when navigation fails with no network.
- `static/app-init.js` updated: registers the service worker after
  `window.load`.

## Non-goals

- **iOS / Safari.** No apple-touch-icon PNG, no Safari-specific meta changes.
  The existing `apple-mobile-web-app-*` tags are left in place (harmless on
  Android). iOS support may be added later.
- **PNG icon generation.** SVG icons work on all supported browsers (Chrome 89+,
  Firefox 113+). No PNG assets are added in this change.
- **Offline data browsing.** The service worker does not cache API responses or
  KV-backed content. Users see the offline page; they cannot browse inventory
  without a network connection.
- **Push notifications, background sync, install prompt UI customisation.** Out
  of scope.

## Capabilities

### New Capabilities

None. This change fulfils an existing requirement from the `design-system` spec
(PWA installability) rather than introducing a new capability domain.

### Modified Capabilities

- `design-system` spec: the PWA installability section is updated to reflect the
  Android-first scope, the service worker requirement, the offline-page
  requirement, and the SVG icon approach.

## Impact

Code:

- `static/lion-maskable.svg` — new file
- `static/offline.html` — new file
- `static/sw.js` — new file
- `static/manifest.json` — icons array updated
- `static/app-init.js` — service worker registration appended
- `openspec/specs/design-system/spec.md` — PWA installability section updated
- `tests/unit/pwa/manifest_test.ts` — unit test for manifest JSON structure
- `tests/e2e/pwa.test.ts` — Playwright spec for install prompt visibility and
  offline page behaviour

Dependencies:

No new runtime or development dependencies.
