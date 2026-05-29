## Context

M1 delivered authentication. M2 establishes the core data model that every
subsequent milestone (boxes, moving, AI classification) builds on. The three
entities — Item, Category, Room — are simple but their KV layout and index
strategy must be chosen carefully now, because changing it later requires a
migration script.

The app has two users and no concurrent writes from different sessions, so
optimistic concurrency is sufficient and heavy transactional patterns are
unnecessary.

## Goals / Non-Goals

**Goals:**

- Define the canonical KV schema for Item, Category, and Room.
- Implement repository functions with atomic index maintenance.
- Deliver a mobile-friendly CRUD UI for items (primary use case: phone in hand
  during the move).
- Include `photoKey` and `status` fields on Item now so M3 and M6 do not
  require a schema migration.
- Admin-only CRUD for categories and rooms.

**Non-Goals:**

- Photo upload or thumbnail generation (M3).
- Box assignment or moving workflow (M3/M4).
- AI classification pipeline (M6).
- Bulk import or export.
- Value estimation beyond a simple optional number field.

## Decisions

### KV key layout

```
["category", categoryId]          → Category
["room", roomId]                  → Room
["item", itemId]                  → Item
["item-by-category", catId, itemId] → true   (index)
["item-by-room", roomId, itemId]    → true   (index)
```

**Why prefix indexes over secondary scans?** Deno KV has no query engine.
Listing items by category or room without an index requires scanning all items —
O(n) — which is fine for tens of items but breaks for hundreds. Prefix indexes
give O(k) where k is the result set size.

**Why `true` as the index value?** We always resolve to the full Item record
anyway; storing a copy in the index would create inconsistency risk on update.

**Why no `["item-by-room", null, itemId]` for unassigned items?** Unassigned
items are a transient state (items start unassigned, get a room on unpack).
Listing unassigned items is rare; a full item scan is acceptable for that case.

### ID generation

Use `crypto.randomUUID()` — built into Deno, no library needed, collision-free
for our scale.

### Atomic index maintenance

All writes that touch both the primary record and an index use `kv.atomic()`.
Pattern for create/update:

```
kv.atomic()
  .check({ key: primaryKey, versionstamp: existingVersionstamp })  // optimistic lock on update
  .set(primaryKey, record)
  .delete(["item-by-category", oldCatId, id])   // remove old index entry (update only)
  .set(["item-by-category", newCatId, id], true)
  .delete(["item-by-room", oldRoomId, id])
  .set(["item-by-room", newRoomId, id], true)
  .commit()
```

On delete: remove primary + all index entries in one atomic operation.

### Route structure

Fresh 2 file-based routing:

```
routes/
  items/
    index.tsx       GET  /items          (list, search, filter)
    new.tsx         GET  /items/new      (create form)
    [id].tsx        GET  /items/:id      (detail)
    [id]/edit.tsx   GET  /items/:id/edit (edit form)
  categories/
    index.tsx       GET/POST /categories
  rooms/
    index.tsx       GET/POST /rooms
```

Mutations use HTML form POST (no fetch/JSON API needed). CSRF token is already
handled by the global middleware from M1.

### Search and filter

Server-side: list all items, filter in-process. With hundreds of items this
remains fast enough — Deno KV prefix scans are in-memory. A search input on
`/items` POSTs (or GETs with query params) the filter criteria; Fresh re-renders
the list.

No client-side search island needed for MVP. Add one if latency becomes
noticeable.

### Item status field

`status: "pending" | "suggested" | "confirmed"` is added now for M6 (AI
classification). M2 always sets `status: "confirmed"` on creation (user typed
the name manually, it's confirmed by definition). M6 will set `"pending"` on
photo-only items and `"suggested"` after classification.

### `photoKey` field

`photoKey: string | null` stored on Item. Always `null` in M2. M3 populates it
with the R2 object key. No upload logic needed here.

## Risks / Trade-offs

- **Index drift on partial failure**: `kv.atomic()` prevents partial writes, but
  if a bug constructs an incorrect atomic batch the index can diverge from the
  primary. Mitigation: integration tests verify index consistency after every
  mutation type.

- **In-process filter at scale**: Filtering 1 000 items in a single KV prefix
  scan + JS filter is fast today but not infinitely scalable. Acceptable for a
  2-person home inventory; a real-app concern only if the item count grows by
  2–3 orders of magnitude.

- **No pagination in MVP**: The list route returns all items. Acceptable for
  expected item counts (< 500). Easy to add cursor-based pagination later using
  KV's `cursor` option in `list()`.
