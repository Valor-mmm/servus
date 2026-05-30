## 1. Design tokens and Bavarian palette

- [x] 1.1 Rewrite `static/styles.css`: define all `--servus-*` CSS custom
      properties (bg, surface, text, primary, primary-hover, accent, danger,
      border, radius, shadow) with light-theme Bavarian values
- [x] 1.2 Add `@media (prefers-color-scheme: dark)` block overriding all color
      tokens with dark-theme equivalents
- [x] 1.3 Update base `html`, `body`, `input`, `select`, `textarea`, and
      `button` styles to use the new tokens
- [x] 1.4 Define `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-small`
      classes; preserve bare `button` as primary style alias

## 2. Lion mascot SVG and empty states

- [x] 2.1 Create `static/lion.svg` — geometric Bavarian lion placeholder (simple
      shield + lion silhouette, no external dependencies)
- [x] 2.2 Add empty-state markup to `routes/items/index.tsx`: when item list is
      empty render lion SVG + German prompt (e.g. "Noch keine Gegenstände. Leg
      los!")
- [x] 2.3 Add empty-state markup to `routes/boxes/index.tsx`: when box list is
      empty render lion SVG + German prompt (e.g. "Noch keine Kartons. Erstelle
      deinen ersten!")
- [x] 2.4 Ensure primary CTA button is the largest/most-prominent element on
      list pages (style `.page-header` with CTA placed at top-right or as a
      full-width button below the heading)

## 3. Navigation overhaul

- [x] 3.1 Update `routes/_app.tsx`: add `<nav class="top-nav">` (desktop) and
      `<nav class="bottom-nav">` (mobile) both containing Items, Boxes,
      Categories, Rooms links and logout form; include lion logo `<img>` in
      top-nav
- [x] 3.2 Add CSS: `.top-nav` visible only at `≥ 768px`; `.bottom-nav` fixed at
      bottom, visible only at `< 768px`; icon + label layout for bottom nav
      items
- [x] 3.3 Add `padding-bottom` to `<main>` on narrow viewports so content is not
      obscured by the bottom nav bar

## 4. Status badges

- [x] 4.1 Add `.badge`, `.badge-empty`, `.badge-packed`, `.badge-delivered` CSS
      classes (gray / Bavarian blue / forest green)
- [x] 4.2 Audit box list and detail routes: replace plain status text with
      `<span class="badge badge-{status}">` elements

## 5. Micro-animations

- [x] 5.1 Add fade-up keyframe animation to `styles.css`; apply to
      `.item-list
  li` and `.box-list li` with staggered `animation-delay`
- [x] 5.2 Add `:active` scale transform (`scale(0.97)`) to all button variants
- [x] 5.3 Create `static/confetti.js` — vanilla JS canvas confetti (~30 lines,
      no dependencies); fires once on `DOMContentLoaded` if `?delivered=1` is in
      the URL
- [x] 5.4 Update mark-delivered handler in `routes/boxes/[id].tsx` to redirect
      to `/boxes/:id?delivered=1` after status transition
- [x] 5.5 Add `<script src="/confetti.js">` to box detail page template; CSP
      already allows `script-src 'self'` — no changes needed
- [x] 5.6 Wrap all animations in
      `@media (prefers-reduced-motion: no-preference)` so they are disabled for
      users who prefer reduced motion

## 6. PWA installability

- [x] 6.1 Create `static/manifest.json` with `name`, `short_name`,
      `display: "standalone"`, `theme_color` (Bavarian blue), `background_color`
      (parchment), and an `icons` array pointing to the favicon
- [x] 6.2 Add `<link rel="manifest" href="/manifest.json">` and apple-specific
      PWA `<meta>` tags to `routes/_app.tsx` `<head>`

## 7. Button class audit

- [x] 7.1 Search all route files for bare `button.secondary` and `button.danger`
      class references; replace with `.btn-secondary` and `.btn-danger`
- [x] 7.2 Verify no routes use undefined button class names

## 8. E2E tests

- [x] 8.1 Add `tests/e2e/design.test.ts`: test that bottom nav renders on a
      narrow viewport (set viewport to 390×844), top nav hidden; verify on wide
      viewport (1280×800) the reverse holds
- [x] 8.2 Assert `.badge-packed` and `.badge-delivered` classes are present on a
      packed and delivered box respectively
- [x] 8.3 Assert `/lion.svg` responds with 200 and `content-type: image/svg+xml`
- [x] 8.4 Assert `<link rel="manifest">` is present in the HTML head on any
      authenticated page
- [x] 8.5 Assert confetti script tag is present on box detail page when
      `?delivered=1` query param is present
