## 1. Dark Mode Infrastructure

- [x] 1.1 Convert `@media (prefers-color-scheme: dark)` block in `styles.css` to
      `html.dark { ... }` selectors; keep a companion `@media` rule that sets
      `html.dark` when no localStorage key exists
- [x] 1.2 Add anti-flash inline `<script>` in `<head>` of `_app.tsx` (before
      stylesheet link) that reads `localStorage("servus-theme")` and sets
      `html.dark` synchronously
- [x] 1.3 Add dark mode toggle button to `.top-nav` in `_app.tsx` (desktop,
      ≥768px); clicking it toggles `html.dark` and writes to `localStorage`
- [x] 1.4 Add fixed-position FAB toggle button for mobile (<768px) in
      `_app.tsx`; hidden on desktop via CSS
- [x] 1.5 Update dark palette tokens in `styles.css` to Bavarian warm values
      (see design.md token table)
- [x] 1.6 Write E2E test: toggle dark mode on desktop → class applied +
      localStorage set → persists on reload

## 2. Active Navigation State

- [x] 2.1 In `_app.tsx`, determine active path from `ctx.url.pathname` and apply
      `.nav-active` class to the matching top-nav link and bottom-nav item using
      `startsWith` matching
- [x] 2.2 Add `.top-nav a.nav-active` CSS: 2px gold bottom border
      (`--servus-nav-active`)
- [x] 2.3 Add `.bottom-nav a.nav-active` / `.bottom-nav button.nav-active` CSS:
      2px gold top border + full opacity

## 3. Quick-Add Visual Treatment

- [x] 3.1 Add `.nav-quick-add` CSS in `styles.css`: gold pill background behind
      the icon, slightly larger icon size

## 4. Desktop Layout and Typography

- [x] 4.1 In `styles.css`, update `.page` max-width to `960px` under
      `@media (min-width: 768px)`
- [x] 4.2 Scale `h1` to `2rem` on desktop under `@media (min-width: 768px)`
- [x] 4.3 Increase `.item-row` padding to `0.875rem 1.25rem` and `.item-list`
      gap to `0.625rem` on desktop
- [x] 4.4 Increase `.page-header` margin-bottom to `1.5rem` on desktop; add a
      subtle bottom border separator

## 5. Mobile Touch Targets

- [x] 5.1 Add `min-height: 44px` to `.btn-small` under
      `@media (max-width: 767px)` in `styles.css`

## 6. Fix Missing CSS Classes

- [x] 6.1 Add `.auth-page` to `styles.css`: centered card layout (max-width
      ~400px, vertical centering, surface background, padding, shadow)
- [x] 6.2 Add `.photo-gallery` and `.photo-gallery-img` to `styles.css`:
      responsive grid (auto-fill, min 150px columns) with constrained image
      sizing and border-radius
- [x] 6.3 Add `.qty-controls` and `.qty-label` to `styles.css`: flex row
      container with centered min-width label
- [x] 6.4 Add `.badge-pending` to `styles.css`: amber/warning color (background
      ~`#fef3c7`, text ~`#92400e`)
- [x] 6.5 Add `.photo-capture`, `.photo-capture--multi`, `.capture-btn`, and
      `.capture-error` to `styles.css`: flex column container, full-width
      label/button, error text style

## 7. Small UX Fixes

- [x] 7.1 Change the "Zurück" link in `routes/items/[id].tsx` from a bare `<a>`
      to `<a class="btn-secondary">`
- [x] 7.2 Add `title` attributes to all top-nav links in `_app.tsx` matching
      their label text

## 8. Lazy Thumbnail Loading

- [x] 8.1 In `routes/items/index.tsx`, change presigned URL output from `src` to
      `data-src` on thumbnail `<img>` elements; add explicit `width` and
      `height` attributes (40px × 40px) to prevent reflow
- [x] 8.2 Add CSS shimmer placeholder for `.item-thumbnail:not([src])` in
      `styles.css`; respect `prefers-reduced-motion` with a static fallback
      color
- [x] 8.3 Add `IntersectionObserver` inline script (plain JS, not an island) at
      end of `<body>` in `_app.tsx`; observes all `[data-src]` images and swaps
      `data-src` → `src` on intersection
- [x] 8.4 Write E2E test: page loads with thumbnails → off-screen items have no
      `src` → scrolling reveals them → `src` is set

## 9. Presigned URL Error Handling

- [x] 9.1 Extend the inline script from task 8.3 to attach an `error` event
      listener to each `[data-src]` image after `src` is set; on first error
      replace image with placeholder icon and inject a single dismissable
      `.photo-error-banner` at the top of `.page`
- [x] 9.2 Add `.photo-error-banner` CSS to `styles.css`: dismissable banner
      style (accent border, warning background, dismiss button)

## 10. Validation and E2E

- [x] 10.1 Run `deno task fmt` and `deno task lint` — fix any issues
- [x] 10.2 Run `deno task test` — confirm all unit and integration tests pass
- [x] 10.3 Write Playwright E2E scenario: authenticated user visits `/items` →
      page renders in correct theme → dark mode toggle switches theme and
      persists → nav active state correct → thumbnails lazy-load on scroll →
      login page is properly centered
- [x] 10.4 Run `deno task e2e` — confirm E2E scenario passes
