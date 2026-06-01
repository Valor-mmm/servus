## Why

The app is functional but visually unpolished: ten CSS classes referenced in
components have no definitions (causing layout breakage on the login page and
the photo-capture workflow), the dark mode uses cold tech-gray tones that drop
the Bavarian character, no nav item is ever highlighted as active, and all item
thumbnails load eagerly from R2 regardless of whether the user ever scrolls to
them. This change makes the app look intentional on both desktop and mobile
without restructuring any routes or touching the data layer.

## What Changes

- **Desktop layout width**: `.page` max-width increases from `720px` to `960px`
  on viewports ≥ 768 px, eliminating the ~360 px dead margins on typical desktop
  screens.
- **Dark mode toggle**: replaces the CSS-only
  `@media (prefers-color-scheme:
  dark)` mechanism with a user-controlled
  `html.dark` class toggle. A sun/moon button appears in the top nav (desktop)
  and as a fixed FAB (mobile). Preference is persisted in `localStorage`; system
  preference is the initial default.
- **Bavarian dark palette**: the dark theme changes from cold Tailwind slate
  (`#111827`) to warm oak tones (`#1a1410` background, `#251e18` surface) so the
  Bavarian character is preserved in both modes.
- **Active nav state**: both `.top-nav` and `.bottom-nav` gain a gold indicator
  (underline / top-border) on the currently active section, using the
  `--servus-nav-active` token that is already defined but unused.
- **Quick-add button treatment**: `.nav-quick-add` in the bottom nav gains a
  gold pill background to distinguish the primary mobile action from secondary
  nav links.
- **Fix ten missing CSS classes**: `.auth-page`, `.photo-gallery`,
  `.photo-gallery-img`, `.qty-controls`, `.qty-label`, `.badge-pending`,
  `.photo-capture`, `.photo-capture--multi`, `.capture-btn`, `.capture-error`
  are all used in components but not defined, causing visual breakage.
- **Desktop spacing and typography**: H1 scales to `2rem`, item-row padding
  increases, a separator appears below the page header — all under a `768px`
  media query.
- **Mobile touch targets**: `btn-small` gains `min-height: 44px` on mobile so
  quantity controls meet the iOS touch-target minimum.
- **Lazy thumbnail loading**: item thumbnails switch from eager `src` to
  `data-src` with an `IntersectionObserver` that only fires R2 GET requests when
  an item actually enters the viewport. A CSS shimmer placeholder fills the slot
  while loading.
- **Presigned URL error handling**: an `error` event on any thumbnail triggers a
  dismissable banner prompting the user to reload, plus a placeholder icon
  replaces the broken image.
- **Small UX fixes**: "Zurück" in item detail becomes `btn-secondary`; top-nav
  links gain `title` attributes.

## Non-goals

- No changes to routes, KV, or session/auth logic.
- No filter form behavior changes (deferred to `ui-items-browse-performance`).
- No restructuring of the bottom nav item count or order.
- No new external dependencies.

## Capabilities

### New Capabilities

- `lazy-thumbnails`: IntersectionObserver-based deferred image loading for item
  thumbnails, including CSS shimmer placeholder and presigned-URL error
  handling.

### Modified Capabilities

- `design-system`: dark mode now requires JavaScript (class toggle +
  `localStorage`) instead of being purely CSS-driven; dark palette values
  updated to warm Bavarian tones; active nav state requirement added; ten
  missing CSS classes added; desktop spacing/typography tightened; mobile
  touch-target floor added.

## Impact

- `static/styles.css` — primary file; most changes land here.
- `routes/_app.tsx` — adds `.nav-active` class to current route link; adds dark
  mode toggle button and inline `<script>` for flash prevention.
- `routes/items/[id].tsx` — "Zurück" link changed to `btn-secondary`.
- `islands/QuantityControl.tsx` — no logic change; CSS classes it uses are now
  defined so it renders correctly.
- No new npm/jsr dependencies introduced.
