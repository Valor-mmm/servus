## Context

The app already has the basic manifest skeleton (`display: standalone`,
`start_url`, `theme_color`) and the `<link rel="manifest">` in `_app.tsx`. The
lion-and-shield SVG (`static/lion.svg`) is already used in the top nav. The two
gaps preventing Chrome and Firefox from surfacing the install prompt are:

1. No service worker — Chrome enforces this as a hard requirement.
2. The manifest icon is `favicon.ico` — browsers expect at minimum a 192×192
   image; `.ico` files do not satisfy this.

## Goals / Non-Goals

**Goals:**

- Chrome and Firefox on Android offer installation.
- Installed app opens standalone (no browser URL bar).
- On navigation failure with no network, users see `offline.html` instead of a
  browser error.
- Launcher mask clipping never cuts through the shield (maskable icon).

**Non-Goals:**

- PNG icons, iOS support, offline data, push notifications. (See proposal.)

## Decisions

### D1: SVG-only icons

Chrome 89+ and Firefox 113+ accept `"type": "image/svg+xml"` in the manifest
`icons` array. All supported users are on recent Android with current browser
versions. Generating PNG assets requires a build-time rasterisation step
(imagemagick or WASM-based) and adds binary files to the repo. SVG avoids both.
If PNG support is needed later (older browsers, iOS), the two SVG files serve as
the canonical source.

Manifest entries:

```json
{ "src": "/lion.svg",          "type": "image/svg+xml", "sizes": "any", "purpose": "any"      }
{ "src": "/lion-maskable.svg", "type": "image/svg+xml", "sizes": "any", "purpose": "maskable" }
```

### D2: `lion-maskable.svg` as a separate file

`lion.svg` fills the available space — appropriate for the nav logo. The
maskable variant needs ~20% padding on each side so the shield stays inside the
safe zone when the launcher applies a circular or squircle mask. Separate files
keep each asset's purpose explicit and avoid breaking the nav layout.

Implementation: wrap the existing lion paths inside a `<g>` with a scale +
translate transform that centres the shield at 60% of the 100×100 viewBox, and
add a full-canvas `<rect fill="#F4ECDA"/>` as the background layer.

```
lion-maskable.svg canvas (100×100 viewBox):
┌─────────────────────────────────────────┐
│ #F4ECDA fill (parchment)                │
│                                         │
│         ┌───────────────┐               │
│         │  lion-shield  │  60% of       │
│         │   centred     │  canvas       │
│         └───────────────┘               │
│                                         │
└─────────────────────────────────────────┘
  Launcher clips however it wants —
  shield always inside the safe zone
```

### D3: Minimal service worker, no runtime caching

This is a private two-user app. Stale cached data is a support burden. The SW
caches only files that are known-static at install time (the app shell). All
navigation goes to the network; `offline.html` is the last-resort fallback.

Cache strategy table:

| Request type                         | Strategy                               |
| ------------------------------------ | -------------------------------------- |
| App shell (CSS, JS, SVGs, HTML)      | Cache-first (pre-cached on SW install) |
| Navigation (`request.mode=navigate`) | Network-first, offline fallback        |
| Everything else (API, images)        | Network-only (no caching)              |

App shell pre-cache list:

```
/styles.css
/lion.svg
/lion-maskable.svg
/app-init.js
/theme-init.js
/offline.html
```

Cache version is a string constant (`CACHE_VERSION = "v1"`) baked into `sw.js`.
On `activate`, all caches not matching that name are deleted. When the SW is
updated, bumping `CACHE_VERSION` forces a clean re-cache on the next install.

### D4: `offline.html` as a static file, not a Fresh route

The offline page must be servable without a network request — a Fresh route
depends on the server being reachable. `static/offline.html` is a plain HTML
file pre-cached by the SW. It links to `styles.css` (also cached) for consistent
styling. German copy is hardcoded (the `t()` helper is not available outside the
Fresh server context; this is the documented exception for static assets).

### D5: Service worker registered after `window.load` in `app-init.js`

`app-init.js` already consolidates all imperative client-side bootstrap (theme
toggle, lazy thumbnails, filter dropdowns). Appending SW registration there
keeps the pattern consistent and avoids adding another `<script>` tag in
`_app.tsx`. Registration is guarded by `"serviceWorker" in navigator` so it
degrades silently on environments that do not support it.

## Offline Page Layout

```
┌──────────────────────────────────────┐
│  (parchment background, full page)   │
│                                      │
│                                      │
│          [lion.svg ~120px]           │
│                                      │
│   Koa Netz: Nix los in da Hos™      │  ← h1, bold, Bavarian
│                                      │
│   Wart a Moment und probiars         │  ← p, smaller
│   no amoi.                           │
│                                      │
│           [ Nochmal ]                │  ← .btn-primary, onclick reload
│                                      │
└──────────────────────────────────────┘
```

"Nochmal" calls `window.location.reload()` — retries the exact URL the user was
on, not a redirect to `/items`. This preserves context (e.g. a box detail page
they had open).

Styling uses existing CSS tokens (`--servus-bg`, `--servus-text`,
`--servus-primary`, `.btn-primary`). No new CSS is introduced.
