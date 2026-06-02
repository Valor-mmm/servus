## Why

The items list route loads every item from KV on every request and filters in
JavaScript, regardless of how many items exist. As inventory grows this means
unnecessary KV reads, slower page loads, and silently incomplete search results
(client-side filtering only searches the loaded subset, not the full corpus).
The secondary indexes for category and room already exist but are never used by
the route.

## What Changes

- **New KV secondary index** `["item-by-time", timestamp, id]` maintained on
  every item create/delete, enabling time-ordered listing without a full KV scan.
- **New repository function** `listItemsRecent(limit)` that returns the `N`
  most recently created items using the new index.
- **New repository function** `countItems()` that returns the total item count
  via a prefix scan (no value fetch, cheap).
- **Route load strategy** on `GET /items` is made filter-aware: no params →
  `listItemsRecent(50)`; `?all=1` → `listItems()`; `?cat=X` →
  `listItemsByCategory(X)`; `?room=Y` → `listItemsByRoom(Y)`; `?q=text` →
  `listItems()` + JS substring filter; `?q=text&cat=X` →
  `listItemsByCategory(X)` + JS substring filter.
- **Browse limit UI**: when the 50-item limited view is active the page header
  shows `"50 neueste Gegenstände"` with an approximate total count and a
  `"Alle Gegenstände laden"` button below the list. Both are hidden when
  `?all=1` is active.
- **Filter form behavior**: dropdown selects auto-submit on `change` (no
  Filtern button needed); text search submits explicitly via a search icon
  button; the Filtern button is removed.

## Capabilities

### New Capabilities

- `items-browse-performance`: Time-ordered item listing with a configurable
  limit, filter-aware load strategy, total count display, and a "load all"
  escape hatch.

### Modified Capabilities

- `inventory`: The "Item list with search and filter" requirement changes: the
  default view now loads the 50 most recently created items (not all items);
  filtering by category or room uses existing secondary indexes server-side; text
  search triggers a full load; the Filtern button is replaced by auto-submit
  dropdowns and a search icon button. The KV index consistency requirement gains
  the new `item-by-time` index.

## Impact

- `lib/inventory/itemRepo.ts` — add `listItemsRecent()`, `countItems()`, update
  `createItem()` and `deleteItem()` to maintain the new index atomically.
- `routes/items/index.tsx` — replace the single `listItems()` call with the
  filter-aware dispatch; add browse-limit UI elements; update filter form.
- No new external dependencies.
- No schema migration needed — the KV has only test data as of 2026-06-02;
  confirm with user before implementing.

## Non-goals

- Client-side pagination or infinite scroll.
- Full-text search index (text search still loads all items).
- Any change to item create, edit, delete, or detail routes.
- Any change to auth, sessions, or security headers.
