# UI/UX Design Brief — Polish & Performance

Captured from explore session 2026-06-02. Use this document to create OpenSpec
proposals without needing to re-derive the decisions. All key rationale is
included so future sessions can judge edge cases.

---

## Context

The current UI is functional but not polished. The goals of this work are:

- Make the desktop experience feel designed, not just functional.
- Extend improvements to mobile without breaking anything.
- Reduce unnecessary bandwidth (R2 image requests, full KV scans).
- Keep the Bavarian identity (Bayernblau + Weißbier gold) in both light and dark
  mode.

The work is split into **two sequential OpenSpec changes** plus a backlog of
**future UX proposals** that were identified but not scoped yet.

---

## Change 1: `ui/design-polish`

### Scope summary

Purely additive: CSS additions/edits + small JS behavior. No new routes, no KV
changes, no auth touches.

---

### 1.1 Layout — desktop width

**Decision:** Increase `.page` `max-width` from `720px` to `960px` on desktop
(`@media (min-width: 768px)`).

**Why:** At 720px centered on a 1440px screen, there is ~360px of dead space on
each side. The page reads like a mobile app displayed on a monitor.

**Mobile impact:** None — `.page` on mobile is full-width (padding-only, no
`max-width`).

---

### 1.2 Dark mode toggle

**Decision:** User-controlled toggle (sun/moon button). `localStorage` persists
the choice. System preference (`prefers-color-scheme: dark`) is the default on
first visit.

**Implementation:**

- Convert the existing `@media (prefers-color-scheme: dark)` block to
  `html.dark { ... }` selectors so a JS class toggle can control it.
- Keep a `@media (prefers-color-scheme: dark)` rule that adds the `dark` class
  to `<html>` on first load if no `localStorage` key is set, so the preference
  still works without JS interaction.
- A small inline `<script>` in `<head>` reads `localStorage` and sets
  `html.dark` before first paint to prevent flash.

**Desktop placement:** Button in the `.top-nav`, after the nav links and before
Abmelden.

**Mobile placement:** Small fixed-position FAB (floating action button) in the
top-right corner of the viewport. Hidden on desktop (top nav has it). The bottom
nav already has 6 items and cannot take another.

```
Mobile:
┌────────────────────────[☀️]─┐  ← fixed, top-right, z-index above page
│  📦 Gegenstände              │
│  ...                         │
└──────────────────────────────┘
[📦] [🗃️] [➕] [🏷️] [🏠] [🚪]
```

---

### 1.3 Bavarian dark palette

**Decision:** Replace the current cold Tailwind-slate dark palette with a warm
oak/tavern dark that preserves Bavarian character.

**Why:** The current dark mode (`#111827`, `#1f2937`) drops the Bavarian feel
entirely. It looks like a generic tech dark mode.

**New dark palette:**

| Token                     | Current (cold) | New (Bavarian warm) |
| ------------------------- | -------------- | ------------------- |
| `--servus-bg`             | `#111827`      | `#1a1410`           |
| `--servus-surface`        | `#1f2937`      | `#251e18`           |
| `--servus-surface-raised` | `#263242`      | `#2e2419`           |
| `--servus-text`           | `#f3ede4`      | `#f0e6d4`           |
| `--servus-text-muted`     | `#9d8f80`      | `#9d8873`           |
| `--servus-border`         | `#374151`      | `#3d2f24`           |
| `--servus-primary`        | `#3b82f6`      | `#4a8fd4`           |
| `--servus-accent`         | `#f0b429`      | `#e0a820`           |
| `--servus-nav-bg`         | `#1f2937`      | `#0f0c09`           |
| `--servus-nav-active`     | `#f0b429`      | `#e0a820`           |

The nav in dark mode stays deep Bavarian (near-black wood) rather than going
slate.

---

### 1.4 Active nav state

**Decision:** Apply a gold indicator to the currently active section in both
navbars.

**Token already defined:** `--servus-nav-active: #c5900a` (light) / `#e0a820`
(dark). It is never used anywhere — just add the selectors.

**Desktop (`.top-nav`):** 2px gold bottom border on the active link.

**Mobile (`.bottom-nav`):** 2px gold top border + full opacity on the active
item.

**Implementation:** In `_app.tsx`, detect the current path from
`ctx.url.pathname` (or pass through state) and apply a `.nav-active` class to
the matching nav link.

---

### 1.5 Quick-add button visual treatment

**Decision:** Give `.nav-quick-add` in the bottom nav a visually elevated
appearance — it is the primary action on mobile and should look distinct.

**Current state:** `.nav-quick-add` class exists in `_app.tsx` but has zero CSS.
It renders identically to all other nav items.

**Proposed treatment:** Small colored pill background (gold accent) behind the
➕ icon. Slightly larger icon size. No additional height or FAB — stays within
the bottom nav bar to avoid layout shift.

---

### 1.6 Fix broken/missing CSS classes

These classes are referenced in TSX components but not defined in `styles.css`.
All broken on both mobile and desktop.

| Class                   | Used in                       | What it needs              |
| ----------------------- | ----------------------------- | -------------------------- |
| `.auth-page`            | `routes/login.tsx`            | Centered card layout       |
| `.photo-gallery`        | `routes/items/[id].tsx`       | Grid or horizontal scroll  |
| `.photo-gallery-img`    | `routes/items/[id].tsx`       | Constrained image sizing   |
| `.qty-controls`         | `islands/QuantityControl.tsx` | Flex row container         |
| `.qty-label`            | `islands/QuantityControl.tsx` | Centered, min-width        |
| `.badge-pending`        | `routes/items/index.tsx`      | Amber/warning color        |
| `.photo-capture`        | `islands/PhotoCapture.tsx`    | Flex column container      |
| `.photo-capture--multi` | `islands/PhotoCapture.tsx`    | Same + preview strip space |
| `.capture-btn`          | `islands/PhotoCapture.tsx`    | Full-width label/button    |
| `.capture-error`        | `islands/PhotoCapture.tsx`    | Error text styling         |

The photo-capture classes are mobile-critical (the quick-add workflow is
primarily a mobile flow).

---

### 1.7 Spacing and typography

**Desktop-only improvements** (all under `@media (min-width: 768px)`):

- H1: `1.75rem` → `2rem`
- `.page-header` margin-bottom: `1rem` → `1.5rem`
- `.item-row` padding: `0.75rem 1rem` → `0.875rem 1.25rem`
- `.item-list` gap: `0.5rem` → `0.625rem`
- Add a subtle separator line between `.page-header` and the content below it

**Mobile-only improvement:**

- `btn-small` minimum touch target: add `min-height: 44px` for mobile. The
  current `padding: 0.3rem 0.65rem` renders at ~34px, under the iOS 44pt
  minimum. Affects quantity controls in the item list.

---

### 1.8 Small UX fixes

- **"Zurück" link in item detail** (`routes/items/[id].tsx`): currently a naked
  `<a>` in the actions bar. Change to `btn-secondary`.
- **Nav link `title` attributes**: add `title` to top-nav links for hover
  tooltips on desktop.

---

### 1.9 Lazy thumbnail loading with IntersectionObserver

**Decision:** Use `data-src` instead of `src` on item thumbnails. A small inline
script (no island needed — plain DOM API) observes elements and swaps `data-src`
→ `src` when they enter the viewport.

**Why:** R2 GET requests are the real bandwidth concern, not KV reads. An item
with a thumbnail but never scrolled into view currently still triggers an R2
request. With lazy loading, only visible items load their images.

**Interaction with filters:** When an item is hidden by a filter
(`display:
none`), the observer never fires. When revealed, if it enters the
viewport, the observer fires and the image loads. Works correctly.

**Loading placeholder:** CSS only — the thumbnail slot shows the background
color until the image loads. A subtle shimmer animation (`@keyframes shimmer`)
is optional.

**Presigned URL note:** URLs are generated at page-load time. They will expire
(typically after 1 hour). This is acceptable for typical usage but is handled by
the error handler below.

---

### 1.10 Presigned URL error handling

**Decision:** When a thumbnail image fails to load (403 expired, network error),
show a discreet page-level warning banner with a reload prompt.

**Implementation:**

- `img.addEventListener('error', ...)` on each lazy-loaded thumbnail
- First failure: inject a dismissable banner at top of page:
  `"Einige Bilder konnten nicht geladen werden. → Seite neu laden"`
- Subsequent failures on the same page: no additional banners (already shown)
- Replace the failed thumbnail slot with a neutral placeholder icon (e.g. 🖼️ or
  a broken-image indicator in the surface color)

---

## Change 2: `ui/items-browse-performance`

### Scope summary

Behavior change to the items list route + one new KV secondary index. Touches
`lib/inventory/itemRepo.ts` and `routes/items/index.tsx`. Requires TDD per the
project workflow.

---

### 2.1 New secondary index: time-ordered items

**Decision:** Add `["item-by-time", timestamp, id]` as a secondary index on
every item write.

**Why `listItems()` cannot be limited today:** Items are stored as
`["item", uuid]` where the UUID is `crypto.randomUUID()` (random, not
time-ordered). `kv.list({ prefix: ["item"], limit: 50 })` returns 50 items in
UUID lexicographic order — essentially random. In-memory alphabetical sort then
sorts those 50 random items, not the 50 most recently added.

**Implementation:**

- In `createItem`: add `op.set(["item-by-time", now, id], true)` to the atomic
  operation (where `now = Date.now()`).
- In `deleteItem`: add `op.delete(["item-by-time", item.createdAt, id])` to the
  atomic operation.
- No migration needed — KV has no live/real data (verify this assumption before
  implementing; ask the user if the app has gone live).

**New repo function:**

```ts
export async function listItemsRecent(limit: number): Promise<Item[]>;
// Uses kv.list({ prefix: ["item-by-time"], limit, reverse: true })
// → most recently created items first
// Fetches each item via findItem() for the full record
```

---

### 2.2 Items route handler — load strategy

**Decision:** The load strategy depends on which filter params are active.

| Params active    | Load function                        | Rationale                            |
| ---------------- | ------------------------------------ | ------------------------------------ |
| None             | `listItemsRecent(50)`                | Fast browse; show 50 most recent     |
| `?all=1`         | `listItems()`                        | User explicitly asked for everything |
| `?cat=X`         | `listItemsByCategory(X)`             | Existing index, loads only that cat  |
| `?room=Y`        | `listItemsByRoom(Y)`                 | Existing index, loads only that room |
| `?q=text`        | `listItems()` + JS filter            | No text index; full load unavoidable |
| `?q=` + `?cat=X` | `listItemsByCategory(X)` + JS filter | Use narrowest index first            |

**Note:** `listItemsByCategory` and `listItemsByRoom` already exist in
`itemRepo.ts` but are not used by the items index route. The route currently
calls `listItems()` (all) for every request and filters in JS, ignoring the
secondary indexes entirely.

---

### 2.3 "Browse limit" UI elements

When displaying the 50-item limited view (no active filter, no `?all=1`):

- Page header shows: `"Gegenstände (50 neueste von ~500)"` — count is
  approximate since we don't store a total count separately (KV has no `COUNT`).
  Options: (a) omit the total, show just `"50 neueste Gegenstände"`; (b) run a
  separate prefix scan just for count (cheap — KV list with no value fetch).
  Prefer option (b) if count can be cached or is fast enough.
- A prominent `"Alle Gegenstände laden"` button below the item list.
- When `?all=1` is active: the button is hidden, no count note.

---

### 2.4 Filter form behavior

**Decision:** All filtering is server-side. Client-side filtering was considered
but dropped because it gives silently incomplete results when the item list is
limited (50 items loaded — filter only searches those 50, misses the other 450).

**Dropdown selects** (`?cat`, `?room`): auto-submit on `change` via
`onchange="this.closest('form').requestSubmit()"`. No Filtern button needed for
these.

**Text search** (`?q`): explicit submit only (pressing Enter or a search
button). Always triggers a full `listItems()` load server-side to search the
complete corpus. Remove the Filtern button, replace with a small search icon
button.

**Result:** The Filtern button is removed from the filter form. Its two jobs
split: dropdowns auto-submit; text search has a dedicated search button.

---

## Future UX proposals (not scoped yet)

These were identified during the explore session. Each needs its own
`/openspec-propose` when the time comes.

### F1: Packing progress dashboard widget

A summary header on the items and/or boxes pages showing move progress:

```
[12 von 48 Kisten verpackt] [7 Gegenstände ohne Zimmer] [3 Kisten geliefert]
```

Drives clarity during the move. Requires aggregating across box statuses and
item room assignments — feasible with KV list scans but needs careful design to
avoid N+1 reads.

### F2: Breadcrumb navigation

On detail and edit pages (`/items/[id]`, `/items/[id]/edit`, `/boxes/[id]`),
show a breadcrumb:

```
Gegenstände › Winterjacke › Bearbeiten
```

Needs a shared component and integration in each route's page header.

### F3: Keyboard shortcuts

Desktop-focused shortcuts:

- `/` → focus search input
- `N` → navigate to new-item form
- `Escape` → clear search / close dialogs

Needs a small keyboard listener island, scoped to authenticated pages only.

### F4: Box code lookup

A dedicated input (or the existing search) that, if the user types a box code
(e.g., `B-042`), jumps directly to that box's detail page. Useful during the
physical move when someone is standing next to a labeled box. Could be a
typeahead or a simple redirect on exact code match.

---

## Key technical findings (for proposal authors)

1. **`listItems()` already loads everything**: The handler for `/items` calls
   `listItems()` with no limit and then filters in JS. This was never a
   deliberate architectural decision — it was the simplest MVP approach.

2. **Three secondary indexes exist but the route ignores two of them**:
   `listItemsByCategory()` and `listItemsByRoom()` are defined in `itemRepo.ts`
   and maintained on every write, but `routes/items/index.tsx` never calls them.

3. **`--servus-nav-active` token is defined but used by no CSS selector**: It is
   set in both `:root` and the dark mode block. Any active nav implementation
   just needs to use it in a selector.

4. **No live data — no migration concern (as of 2026-06-02)**: KV contains only
   test data. Schema-breaking changes (new indexes, key structure changes) can
   be made without backfill. **Always verify this with the user before acting on
   it** — they may have added real data since this was noted.

5. **Presigned URL expiry**: URLs for R2 thumbnails are generated at page-load
   time via `presignGet()`. Duration is set in `lib/photos/signing.ts` (check
   before implementing error handling to confirm the actual TTL).

6. **`.photo-capture` and friends are mobile-critical**: The quick-add flow
   (`/items/quick-add`) uses `PhotoCapture.tsx` which references several CSS
   classes with no definitions. This is currently broken on both platforms but
   especially bad on mobile where quick-add is the primary workflow.
