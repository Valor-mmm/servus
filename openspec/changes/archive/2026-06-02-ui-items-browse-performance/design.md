## Context

The `GET /items` route currently calls `listItems()` on every request, which
does a full `kv.list({ prefix: ["item"] })` scan and returns all items to the
route handler. The route then filters in JS. This has two problems:

1. **Correctness**: filtering in JS on the full load is fine today, but if the
   route were ever limited (e.g., `limit: 50`), a client-side filter would
   silently search only the loaded subset rather than the corpus. The design
   brief names this as an explicit risk.
2. **Efficiency**: `listItemsByCategory()` and `listItemsByRoom()` already exist
   in `itemRepo.ts` and are maintained atomically on every write, but the route
   never calls them. We pay the full-scan cost even when a category or room
   filter is active and a narrow index is available.

The fix introduces a time-ordered secondary index so the default ("recent 50")
path is cheap, makes the route filter-aware so it picks the narrowest available
index, and moves all filtering server-side.

## Goals / Non-Goals

**Goals:**

- Default view loads ≤ 50 items via the new time index (cheap).
- Category and room filters use the existing secondary indexes (cheap).
- Text search is honest: it forces a full load so results are never silently
  incomplete.
- The UI communicates the browse limit and gives a one-click escape hatch.
- All filtering is server-side — no silent subset searching.

**Non-Goals:**

- Pagination or infinite scroll.
- A full-text search index (out of scope for MVP).
- Changes to item create/edit/delete or detail routes.
- Any auth, session, or security change.

## Decisions

### Decision: `Date.now()` as the time-index key component

The new index key is `["item-by-time", Date.now(), itemId]`. `Date.now()`
returns milliseconds since epoch — an integer that sorts lexicographically in
the same order as chronological order when used in a Deno KV key.

**Alternative considered: `new Date().toISOString()`** — would also sort
correctly but is a string (12 bytes vs 8 bytes), less idiomatic for KV numeric
keys.

**Alternative considered: storing `createdAt` as the sort key.** We already
write `createdAt: now` onto the item record with the same `Date.now()` value,
so the index key and the item's own `createdAt` are always consistent. Using
`createdAt` in `deleteItem()` means reading the item first (we already do that)
and then deleting the correct index entry.

### Decision: Filter-aware dispatch in the route handler

The route handler reads query params and selects the load function:

| Active params       | Load function                           |
| ------------------- | --------------------------------------- |
| None                | `listItemsRecent(50)`                   |
| `?all=1`            | `listItems()`                           |
| `?cat=X`            | `listItemsByCategory(X)`                |
| `?room=Y`           | `listItemsByRoom(Y)`                    |
| `?q=text`           | `listItems()` + JS substring filter     |
| `?q=text` + `?cat=X`| `listItemsByCategory(X)` + JS filter    |

This keeps all filtering server-side and uses the narrowest available index.
The route handler remains thin — the dispatch logic is a small decision table,
not business logic that needs a separate library.

### Decision: Count via a separate prefix scan

`countItems()` does `kv.list({ prefix: ["item"] })` with no value fetch
(`{ consistency: "eventual" }` is fine for a display count). This is cheap but
not atomic with the item list load. The UI shows `"50 neueste Gegenstände (von
ca. N)"` where the `~` signals approximation — acceptable for a browse hint.

**Alternative considered: maintaining a counter key** — adds write complexity
and a consistency risk (counter and item out of sync). Not worth it for a
display-only count.

### Decision: Auto-submit dropdowns; dedicated search button

Dropdown selects (`?cat`, `?room`) use `onchange="this.closest('form').requestSubmit()"`.
This removes the need for a Filtern button for these controls and gives instant
feedback on selection — consistent with how modern filter UIs behave.

Text search keeps an explicit submit (Enter or search icon button) because
typing fires change events on every keystroke, which would trigger a full
`listItems()` scan per character.

## Risks / Trade-offs

**`Date.now()` collisions within a single atomic operation:** Two items created
in the same millisecond would share the same timestamp key component. KV keys
must be unique; the `itemId` (UUID) is the tiebreaker, so two entries at the
same timestamp are `["item-by-time", T, id1]` and `["item-by-time", T, id2]`
— distinct keys. No collision risk.

**No KV migration for the new index:** The brief confirms KV contains only test
data as of 2026-06-02. Items created before this change are not in the
`item-by-time` index and will not appear in the default "50 newest" view, but
will appear if the user clicks "Alle Gegenstände laden" (`?all=1`). Acceptable
for test data; confirm with user before landing if real data has been added.

**Text search silently loads all items:** This is intentional (see Goals). The
UI should not suggest that text search is filtered-result safe; it always
triggers a full `listItems()`. No mitigation beyond clear documentation.

**Presigned URL count note:** The total count from `countItems()` counts all
items in KV (including any `status: "pending"` items). The count is approximate
anyway, so this is acceptable.

## Migration Plan

1. Merge the PR — Fresh 2 deploys automatically on push to main via `deployctl`.
2. No data migration needed (test data only). If real data has been added,
   a one-shot script seeding the `item-by-time` index from existing item records
   must run before deploying. Confirm with user.
3. Rollback: revert the PR. Old `listItems()` behavior is restored. The orphaned
   `item-by-time` index entries are harmless (unused keys in KV).

## Open Questions

- Has real user data been added to KV since 2026-06-02? If yes, a migration
  script is needed before landing. User must confirm before implementing.
