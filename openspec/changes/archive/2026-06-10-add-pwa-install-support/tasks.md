## 1. Maskable icon

- [x] 1.1 Create `static/lion-maskable.svg` — copy the lion paths from
      `static/lion.svg`, add a full-canvas `<rect fill="#F4ECDA"/>` as the first
      child, and wrap the lion paths in
      `<g transform="translate(20,20) scale(0.6)">` so the shield is centred at
      60% of the 100×100 viewBox with parchment fill around it

## 2. Manifest icons

- [x] 2.1 Add a failing unit test in `tests/unit/pwa/manifest_test.ts` that
      reads `static/manifest.json`, parses it, and asserts: the `icons` array
      has exactly two entries; both have `"type": "image/svg+xml"`; one has
      `"purpose": "any"` and src `/lion.svg`; one has `"purpose": "maskable"`
      and src `/lion-maskable.svg`; no entry references `favicon.ico`
- [x] 2.2 Update `static/manifest.json` — replace the existing `favicon.ico`
      icon entry with the two SVG entries from D1; confirm the test from 2.1
      passes

## 3. Offline page

- [x] 3.1 Create `static/offline.html` — self-contained static HTML with:
      `<link rel="stylesheet" href="/styles.css">`, the lion SVG inlined or as
      `<img src="/lion.svg" width="120" height="120" alt="">`, heading "Koa
      Netz: Nix los in da Hos™", paragraph "Wart a Moment und probiars no
      amoi.", and a
      `<button class="btn-primary"
      onclick="window.location.reload()">Nochmal</button>`;
      styled to be centred on the parchment background using existing CSS tokens

## 4. Service worker

- [x] 4.1 Add a failing unit test in `tests/unit/pwa/sw_test.ts` that reads
      `static/sw.js` as text and asserts: the string `CACHE_VERSION` is present;
      all six app-shell paths (`/styles.css`, `/lion.svg`, `/lion-maskable.svg`,
      `/app-init.js`, `/theme-init.js`, `/offline.html`) appear in the file; the
      string `offline.html` appears as the offline fallback; and `request.mode`
      and `"navigate"` both appear (confirming the navigation detection branch
      exists)
- [x] 4.2 Create `static/sw.js` implementing: - `const CACHE_VERSION = "v1"` and
      `const APP_SHELL = [...]` with the six paths - `install` event: opens the
      versioned cache, calls `addAll(APP_SHELL)` - `activate` event: deletes any
      cache whose name is not `CACHE_VERSION`, calls `clients.claim()` - `fetch`
      event: if the URL is in `APP_SHELL`, serve from cache (falling back to
      network); if `request.mode === "navigate"`, fetch from network and on
      failure respond with the cached `offline.html`; otherwise pass through to
      the network unchanged - Confirm the unit test from 4.1 passes

## 5. Service worker registration

- [x] 5.1 Append service worker registration to `static/app-init.js` — after the
      existing IIFE, add a top-level guard:
      `if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/sw.js");
        });
      }`
      (outside the IIFE, non-blocking, no error handling needed beyond the
      browser's own DevTools reporting)

## 6. Update design-system spec

- [x] 6.1 Update the "PWA installability" section in
      `openspec/specs/design-system/spec.md` to reflect: - Android-first scope
      (iOS deferred) - Service worker is required for install prompt - Manifest
      `icons` MUST include at least one `image/svg+xml` entry with
      `"purpose": "any"` and one with `"purpose": "maskable"` - An offline page
      MUST be cached and served on navigation failure - Add a new scenario:
      "Offline navigation shows offline page"

## 7. Validate and clean up

- [x] 7.1 Run `deno task fmt`, `deno task lint`, `deno check **/*.ts` and fix
      any issues
- [x] 7.2 Run `deno task test` (unit + integration) and confirm all green

## 8. Playwright E2E

- [x] 8.1 Write `tests/e2e/pwa.test.ts` with two scenarios: - **Install prompt
      visible**: navigate to `/items` as an authenticated user; assert the page
      `<head>` contains `<link rel="manifest" href="/manifest.json">` and the
      manifest JSON served at `/manifest.json` includes both SVG icon entries —
      confirming the browser has the data it needs to offer installation -
      **Offline fallback**: use Playwright's `context.setOffline(true)` after
      the page has loaded (allowing the SW to install); navigate to a second
      page; assert the response body contains "Koa Netz" (the offline headline)
- [x] 8.2 Run `deno task e2e` and confirm the new spec and the full E2E suite
      pass green
