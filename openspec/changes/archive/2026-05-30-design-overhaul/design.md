## Context

The app currently ships a single flat `static/styles.css` (~117 lines) with no
design tokens, no dark mode, and no mobile-first layout. Routes use a mixture of
button class names (`btn-primary`, `btn-danger`) that are not defined in the
stylesheet — those buttons render with browser defaults. The top `<nav>` is
inaccessible on mobile with one hand. There is no visual brand identity.

The primary use context is a phone in a hand during a house move: scanning,
creating boxes, bulk-adding items. Speed and thumb-reach matter more than
desktop aesthetics.

**Guiding UX principle**: the app should feel homey and comfortable — something
two people enjoy opening rather than merely tolerate. Every interaction should
be obvious at a glance, require minimal taps, and reward completion with a small
moment of warmth (a color, an animation, a clear success state). Efficiency and
comfort reinforce each other: a cluttered, confusing interface is neither.

## Goals / Non-Goals

**Goals:**

- Single stylesheet rewrite that all routes immediately benefit from — no
  per-route CSS files.
- Token-first: every color, spacing, and radius value in code is a CSS custom
  property so dark mode is a one-block override.
- Bavarian palette that feels warm and trustworthy, not corporate.
- Bottom nav bar as the primary mobile navigation; top nav as desktop fallback.
- Confetti feedback exactly on the "Als geliefert markieren" action — no other
  playful moments except subtle scale + fade.
- PWA installability via `manifest.json` only; no service worker.

**Non-Goals:**

- JS framework for animations — vanilla CSS transitions + a small inline script.
- Offline data, background sync.
- Theme toggle UI — system dark/light is the only signal.
- Custom typefaces.
- Print-page styling changes (label page has its own CSS).

## Decisions

### D1: CSS custom properties for all tokens — no preprocessor

**Choice**: Define tokens as `--servus-*` variables on `:root`, override in
`@media (prefers-color-scheme: dark)`.

**Rationale**: Zero build step. Deno Deploy serves the file as-is. Custom
properties cascade naturally so component-level overrides are possible later.
Sass/PostCSS would add a compile step we don't control.

**Alternatives considered**: Tailwind (too heavy for a two-user app, adds build
complexity), inline styles (no dark mode without JS).

---

### D2: Bottom nav replaces top nav on mobile — top nav kept above 768 px

**Choice**: `<nav class="bottom-nav">` always rendered when authenticated;
hidden via `@media (min-width: 768px)`. A matching `<nav class="top-nav">` is
shown only on desktop. Both contain the same links.

**Rationale**: Single-handed phone use requires thumb-zone navigation. Hiding
the top nav on small screens is the standard PWA pattern. Keeping the top nav on
desktop avoids a jarring layout shift and is what desktop users expect.

**Alternatives considered**: Hamburger menu (extra tap, extra JS); keeping top
nav on mobile (poor ergonomics for the primary use case).

---

### D3: Lion SVG as inline static file, not embedded JSX

**Choice**: `static/lion.svg` served at `/lion.svg`; referenced via `<img>` tags
in `_app.tsx` and in empty-state components.

**Rationale**: Keeps route JSX clean, lets the browser cache the asset, and
avoids duplicating SVG markup across multiple files. The SVG is a geometric
placeholder — the design intentionally leaves room to swap it for a refined
illustration later.

---

### D4: Confetti as a small inline `<script>` on the box detail page

**Choice**: When the page renders a delivered box for the first time (detected
via a `?delivered=1` query param set by the mark-delivered handler), a ~30-line
vanilla JS canvas confetti runs once.

**Rationale**: No library dependency. The animation fires exactly once per
delivery event and requires no ongoing JS. Canvas confetti is well understood
and trivially sandboxed.

**Alternatives considered**: `canvas-confetti` npm package (dependency churn,
requires import map entry); CSS-only (can't do particle physics).

---

### D5: Button classes use `.btn-primary / .btn-secondary / .btn-danger / .btn-small`

**Choice**: Define all four as CSS classes alongside the existing bare `button`
baseline.

**Rationale**: Routes already use these class names. The fix is in the
stylesheet, not in every route file. The bare `button` style becomes the primary
style so unclassed buttons are never unstyled.

---

### D6: PWA manifest only — no service worker

**Choice**: `static/manifest.json` with `display: "standalone"`, icons, and
theme color. Apple-specific `<meta>` tags in `_app.tsx`.

**Rationale**: Offline data requires a cache strategy that would need to be
designed around Deno KV's server-side nature — significant complexity for zero
current benefit. Installability alone makes the app feel native on iOS/Android.

## Risks / Trade-offs

- **Stylesheet rewrite breaks existing visual regression tests** → There are no
  screenshot-based visual tests; Playwright tests assert DOM state, not
  appearance. Low risk.
- **`@media (prefers-color-scheme: dark)` not supported on old browsers** →
  Graceful degradation: the light theme is the default and loads without JS. Our
  two primary users have modern phones.
- **Confetti `<script>` blocked by Content-Security-Policy** → The current CSP
  allows `script-src 'self'`; the inline script will require either a nonce or
  moving the script to `static/confetti.js`. Moving it to a static file is the
  clean path.
- **Bottom nav overlaps page content** → Add `padding-bottom: 4rem` to `<main>`
  when the bottom nav is visible (media query).

## Migration Plan

1. Rewrite `static/styles.css` with tokens, Bavarian palette, dark mode block,
   bottom-nav rules, button class fixes, status badge classes, and fade-up/scale
   animations. All existing HTML class names remain valid.
2. Update `routes/_app.tsx`: dual nav (bottom + top), PWA meta tags, manifest
   link.
3. Add `static/manifest.json` and `static/lion.svg`.
4. Audit all route files for bare `button.danger` / `button.secondary` → replace
   with `.btn-danger` / `.btn-secondary`.
5. Wire confetti: add `?delivered=1` redirect in mark-delivered handler; render
   `<script src="/confetti.js">` when param present; add `static/confetti.js`.
6. Add E2E smoke assertions: nav renders, badge colors present, lion SVG
   reachable, manifest meta tag present.

No database migration needed. No KV schema changes.

## Open Questions

- _(none — scope is fully defined)_
