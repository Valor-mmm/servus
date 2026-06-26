## Context

`routes/index.tsx` currently renders a static page with app name and tagline.
The route handler already has access to `ctx.state.user`. Adding a server-side
data fetch gives a real dashboard without islands.

## Goals / Non-Goals

**Goals:**

- Server-rendered dashboard with four live data tiles
- Prominent "Erfassen" CTA (links to `/items/new` or quick-add)
- Recent items list (last 5) with lazy-loaded thumbnails
- Zero new KV queries — compose from `listItems()` and `listBoxes()`

**Non-Goals:**

- Real-time updates or WebSocket
- Per-user dashboard customization
- New database indexes

## Decisions

**Data fetching**: Call `listItems()` and `listBoxes()` in the GET handler.
Derive all dashboard metrics from those two lists in memory — total items,
incomplete count, packed-box count. Cap recent items at 5 (sort by `createdAt`
desc, take first 5).

**Layout**: Four stat tiles (`.dashboard-tile`) above a "Letzte Gegenstände"
section. Mobile: 2-column tile grid. Desktop: 4-column row. Uses existing CSS
variables.

**Thumbnails**: Use `presignGet` for items that have photos; pass to the
existing `data-src` lazy-load pattern already used on `/items`.

**Empty case**: If no items yet, show `EmptyState` from R1 instead of the tiles.

**Auth**: Dashboard only shown when logged in; unauthenticated users see the
existing auth redirect (handled by `requireAuth` middleware).

## Risks / Trade-offs

`listItems()` fetches all items — acceptable for MVP scale (hundreds of items).
If the list grows to thousands, add a `listRecentItems(limit)` query, but that
is explicitly out of scope here.
