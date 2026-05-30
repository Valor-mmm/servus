## Context

Inventory items are cataloged. The next move-blocking step is assigning items to
labeled physical boxes. Each box needs a short, human-readable code printed on a
label so movers can identify it without a phone, and a QR code on the same label
so anyone with a phone can instantly scan and see the box contents. The existing
`lib/inventory/itemRepo.ts` and KV layout must be extended to support a nullable
`boxId` on items, with atomic mutual exclusion of `boxId` and `roomId`.

## Goals / Non-Goals

**Goals:**

- Box CRUD with auto-incrementing short codes (`B-001`, `B-002`, …).
- Item ↔ Box assignment: assigning a box clears `roomId`; the box owns the
  item's location while packed.
- Printable label page at `/boxes/:id/label` with QR code + short code.
- Bulk-add items to a box from a single textarea input.
- KV indexes stay consistent with all box and item mutations.

**Non-Goals:**

- Box status transitions (`empty → packed → in-transit → unpacked`) — that's M5
  moving-flow.
- Item photos.
- Weight / dimension tracking.
- Multi-box bulk move.

## Decisions

### D1: QR code rendering — server-side SVG via `npm:qrcode`

**Choice:** Render QR codes as inline SVG strings in the route handler using
`npm:qrcode` (the de-facto Node/Deno standard; stable API since 2014, last major
version 1.x in 2019, no churn since).

**Alternatives considered:**

- _Client-side island with a JS QR library_: adds a round-trip before the code
  appears; unnecessary complexity for a page whose sole purpose is printing.
- _Third-party QR URL service (e.g. `api.qrserver.com`)_: external network call
  on every label load; violates the low-dependency principle.
- _Pure-TS from scratch_: QR encoding (Reed-Solomon, masking) is non-trivial; a
  hand-rolled version is maintenance risk for no gain.

`npm:qrcode` can output SVG strings, works in Deno via the npm compatibility
layer, and adds no build step. The import is pinned at a specific version in
`deno.json`.

### D2: Short code generation — atomic KV counter

**Choice:** A single key `["box-code-counter"]` stores the last-issued integer.
`createBox` reads the counter, increments it inside a `kv.atomic()` check-and-
set, and formats the code as `B-${n.toString().padStart(3, "0")}`. If two
concurrent creates race, one retries (standard optimistic-lock pattern already
used in the project).

**Alternatives considered:**

- _Timestamp-based or UUID short code_: not human-memorable; the goal is a code
  a mover can read off a sticky label.
- _Sequence in the Box record itself_: no atomic guarantee without a counter
  key.

### D3: boxId/roomId mutual exclusion — atomic KV mutation

**Choice:** In `itemRepo.updateItem` and `itemRepo.createItem`, when `boxId` is
set the function zeroes `roomId` (and removes the `item-by-room` index entry),
and vice versa. Both sides are written in the same `kv.atomic()` block.

**Alternatives considered:**

- _Validate at the route layer and reject if both are provided_: puts business
  logic in routes; harder to test in isolation.
- _Allow both and resolve at read time_: ambiguous semantics, confusing queries.

### D4: Bulk-add parsing — create-only, server-side

**Choice:** The bulk-add form POST sends a single `textarea` value. The route
handler splits on newlines and commas, trims whitespace, and for each non-empty
token creates a brand-new item (with `status: "confirmed"`, `categoryId` null,
`boxId` set to the current box). No lookup against existing items is performed.

**Rationale:** During packing the user is naming items as they place them in the
box — category/room/photo fields will be filled later via the planned AI image
recognition pipeline. Name collisions across boxes are intentional duplicates
(two copies of the same object), not errors. Removing the matching step
simplifies the implementation and avoids surprising the user by silently moving
an item they already placed elsewhere.

**Alternatives considered:**

- _Match existing items by name_: was initially proposed, but the user confirmed
  items are created fresh during packing and duplicates are handled downstream.
- _Client-side preview island before submitting_: nice UX but out of MVP scope.
- _One form row per item_: too slow for packing 20 items into a box quickly.

**Note on null category:** `categoryId` is nullable on `Item`. The item list
shows a placeholder for uncategorized items; users assign categories later.

### D5: Box destination room — pre-assigned in M3

**Choice:** The `Box` entity gains an optional `destinationRoomId` field (a
reference to an existing `Room`). Users can pre-assign where a box will go
before the move, and this room is printed on the label so movers know which room
to carry the box to. M5's "unpack" action will use this pre-assigned room to
atomically update all items in the box.

**Rationale:** The label needs to show the destination room for the move to work
without phone lookups. Storing it on the box (rather than inferring it from
items) is the natural model — the box goes to one room, all its items follow.

**KV impact:** Add `["box-by-room", roomId, boxId]` index. The `Room` deletion
guard (from the `inventory` spec) does NOT need to check boxes — a room with
boxes referencing it can still be deleted (the `destinationRoomId` on the box
becomes a dangling reference that the UI treats as "no room assigned").
Rationale: during an active move, rooms and boxes change rapidly; blocking room
deletion on box references would be annoying. The move spec (M5) can revisit
this.

## Risks / Trade-offs

- **KV atomic batch limit (10 ops):** Bulk-adding more than ~3 new items at once
  (each new item = 3 KV ops: primary + category index + box index) will require
  batching into groups of 3. Bulk-add is not fully atomic across all items;
  partial success is acceptable — the user sees which items were added and can
  re-submit the remainder. A summary is shown after POST.
- **`npm:qrcode` SVG output size:** For a short URL like
  `https://servus.valor.codes/boxes/B-042`, the SVG is ~4 KB — negligible.
- **Counter contention:** Unlikely given 2 primary users, but the optimistic-
  lock retry loop is already tested in the codebase.

## Migration Plan

No existing data to migrate. The `boxId` field is nullable on `Item`; all
existing items have `boxId: null` by default (no KV backfill needed since KV
reads return `undefined` for missing fields, which the repo layer coerces to
`null`).

## Open Questions

_(none — all decisions above are sufficient to begin implementation)_
