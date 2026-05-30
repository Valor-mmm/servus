## Why

The app is functionally complete through M4 but looks bare and generic — plain
gray UI, no mobile-first layout, no visual identity. Before the move it needs to
be pleasant and fast to use on a phone, one-handed, in a hallway surrounded by
boxes. The next blocked milestone (M5 item photos) requires Cloudflare R2 setup
that isn't in place yet; a full design overhaul is self-contained and delivers
immediate value.

**UX north star**: the app must feel homey and comfortable — not a sterile tool
you endure, but something you are genuinely happy to open and use daily. Good UX
is the primary deliverable of this milestone. The visual identity, warm palette,
and considered interactions should make the app feel like it belongs in the
home, not in a corporate IT department. Comfort and efficiency are not in
tension here: clarity, obvious affordances, and thumb-friendly layout are what
make both possible simultaneously.

## What Changes

- **Design tokens via CSS custom properties** — a single source of truth for
  color, spacing, radius, and shadow across the whole app; dark mode is a free
  by-product.
- **Bavarian palette** — rich blue (`#1A5FA8`), warm parchment (`#FDF8F0`),
  lion-gold accent (`#C5900A`) replace the generic gray.
- **Dark mode** — `@media (prefers-color-scheme: dark)` overrides the same token
  names; no extra class-based toggling needed.
- **Lion mascot SVG** — a minimal geometric Bavarian lion used as the app logo
  in the nav bar and as the empty-state illustration on lists.
- **Bottom navigation bar** — thumb-reachable on mobile; replaces the current
  top `<nav>` (top nav kept as a desktop fallback at ≥ 768 px).
- **Button class fixes** — routes use `.btn-primary`, `.btn-secondary`,
  `.btn-danger`, `.btn-small`; the current stylesheet only defines
  `button.secondary` and `button.danger`. All class-based variants get defined.
- **Status badges** — distinct color chips for box statuses: empty = neutral
  gray, packed = Bavarian blue, delivered = forest green.
- **Micro-animations** — subtle fade-up on list render, scale feedback on button
  press, and a short confetti burst when a box is marked as delivered (using a
  tiny vanilla JS snippet, no library).
- **PWA shell** — `manifest.json` + apple-mobile-web-app meta tags make the app
  installable. No service worker; offline data is out of scope.
- **`<main class="page">` wrappers** — all route pages get consistent page
  chrome so the layout tokens apply uniformly.

## Capabilities

### New Capabilities

- `design-system`: CSS custom-property token system, Bavarian palette, dark
  mode, lion mascot SVG, bottom nav bar, status badges, micro-animations, PWA
  manifest.

### Modified Capabilities

_(none — no behavior requirements change; this is purely visual/UX.)_

## Impact

- `static/styles.css` — near-complete rewrite; existing class names preserved or
  aliased so no route JSX changes are needed beyond button class fixes.
- `routes/_app.tsx` — add PWA `<meta>` tags, manifest link, and switch `<nav>`
  to bottom-nav structure with desktop fallback.
- `static/manifest.json` — new file.
- `static/lion.svg` — new file (geometric placeholder; refined artwork
  deferred).
- All route files — audit and fix button class names (`btn-primary` etc.).
- No new runtime dependencies. The confetti animation is a small inline script
  (~30 lines). The CSS custom property system requires no tooling.
- No spec-level behavior changes; existing E2E tests continue to pass against
  the restyled UI.

## Non-goals

- Custom web fonts (adds latency, no hosting cost benefit).
- A theme-selection UI (dark/light toggle); system preference is the signal.
- Service worker or offline data.
- Refined lion artwork — the SVG placeholder ships now; a polished mascot is a
  future nice-to-have.
- Any layout changes to the label print page (`/boxes/:id/label`) — it already
  has its own print-optimised CSS.
