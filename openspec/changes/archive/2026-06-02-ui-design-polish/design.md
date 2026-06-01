## Context

The stylesheet (`static/styles.css`) already defines CSS custom property tokens
for the Bavarian palette including `--servus-nav-active`, but several of those
tokens are unused and ten CSS classes referenced in components have no
definitions. Dark mode currently works via a
`@media (prefers-color-scheme:
dark)` block with cold gray values; there is no
user-controlled toggle. The `.page` max-width is 720 px regardless of viewport
width.

## Goals / Non-Goals

**Goals:**

- Ship a visually polished UI on both desktop and mobile with no new routes or
  KV changes.
- Give users explicit control over dark mode, persisted across sessions.
- Eliminate eager R2 thumbnail fetches for off-screen items.
- Fix all CSS class gaps that currently cause layout breakage.

**Non-Goals:**

- Filter form behavior or item load limiting (deferred to
  `ui-items-browse-performance`).
- Restructuring or reordering bottom nav items.
- Adding any external CSS framework or icon library.

## Decisions

### D1 — Dark mode: `html.dark` class + localStorage, not pure CSS

**Decision:** Convert the `@media (prefers-color-scheme: dark)` block to
`html.dark { ... }` selectors. A tiny inline `<script>` in `<head>` reads
`localStorage` before first paint and sets the class when needed, preventing a
flash of the wrong theme. System preference remains the default when no
`localStorage` key exists.

**Why not keep pure CSS?** A CSS-only approach cannot be overridden by the user
without changing their OS setting. The product wants a toggle the user can
control within the app.

**Why not store preference in KV/session?** KV storage would require a server
round-trip on every page load or a session middleware change. `localStorage` is
zero-latency, works offline, and requires no backend change. The downside (not
syncing across devices) is acceptable for a two-user household app.

**Inline script placement:** In `<head>`, before any `<link rel="stylesheet">`,
so the class is set before CSS is parsed. This is the standard "anti-flash"
pattern used by every major dark mode implementation.

---

### D2 — Dark mode toggle on mobile: fixed FAB, not bottom nav

**Decision:** On mobile (< 768 px), render a small fixed-position button
(`position: fixed; top: 0.75rem; right: 0.75rem`) that is hidden on desktop (top
nav has the toggle there).

**Why not add to bottom nav?** The bottom nav already has six items, which is at
the practical limit for a mobile tab bar. Adding a seventh would make all items
too narrow on small phones.

**Why not a settings page?** Creating a new route just for a theme toggle adds
unnecessary complexity for MVP.

---

### D3 — Active nav state: URL-prefix matching in `_app.tsx`

**Decision:** In `_app.tsx`, compare `ctx.url.pathname` against each nav link's
href using `startsWith`. Apply a `.nav-active` class to the matching link.

**Why startsWith?** `/items/abc123` should highlight the Items nav link. Exact
equality would miss detail and edit pages.

**Edge case:** The logo link (`href="/items"`) does not get `.nav-active` — only
the explicit nav link does.

---

### D4 — Lazy thumbnails: IntersectionObserver inline script, not an island

**Decision:** Use a plain `<script>` tag at the end of `<body>` (not a Preact
island) to register an `IntersectionObserver` on all `[data-src]` images.

**Why not an island?** An island ships Preact hydration overhead. The observer
needs no reactive state — it's a one-time DOM operation that does not need to
re-render. A ~25-line plain script is simpler, smaller, and loads synchronously
without the island bundle.

**`data-src` placement:** The server sets `data-src` (not `src`) on thumbnail
`<img>` elements when a presigned URL is available. The image element has a
fixed `width`/`height` so the page doesn't reflow when the image loads.

**Shimmer placeholder:** CSS `@keyframes shimmer` with
`background: linear-
gradient(...)` on `.item-thumbnail:not([src])`. Respects
`prefers-reduced-
motion` by falling back to a static placeholder color.

---

### D5 — Presigned URL error recovery: page-level banner, single instance

**Decision:** On the first `error` event from any thumbnail, inject a
dismissable `<div class="photo-error-banner">` at the top of `.page`. Subsequent
errors on the same page do not add more banners. The failed image slot gets a
static broken-image placeholder icon.

**Why not retry?** Retrying an expired presigned URL will always 403. The only
fix is a page reload to regenerate URLs. The banner makes this clear.

---

### D6 — Missing CSS classes: define in `styles.css`, no component changes

All ten missing classes (`.auth-page`, `.photo-gallery`, `.photo-gallery-img`,
`.qty-controls`, `.qty-label`, `.badge-pending`, `.photo-capture`,
`.photo-capture--multi`, `.capture-btn`, `.capture-error`) are added to
`styles.css`. No changes to the TSX files that reference them — the class names
are already correct.

## Risks / Trade-offs

- **Flash of wrong theme**: Mitigated by D1's inline `<script>` in `<head>`.
  There is a theoretical race if the script is very slow, but in practice this
  is sub-millisecond for a `localStorage` read.
- **IntersectionObserver support**: Supported in all modern browsers and in the
  PWA targets (iOS Safari 12.2+, Chrome 58+). No polyfill needed.
- **Presigned URL expiry window**: URLs are valid for the duration configured in
  `lib/photos/signing.ts`. If a user keeps the page open past expiry and then
  scrolls to a previously-hidden item, the image will 403. The error banner (D5)
  handles this gracefully.
- **`startsWith` nav matching**: A future route whose path starts with `/items`
  but belongs to a different nav section would incorrectly highlight the Items
  link. Acceptable risk for MVP with the current flat route structure.

## Open Questions

- None. All decisions are resolved based on the explore session brief
  (`docs/design-brief-ui-polish.md`).
