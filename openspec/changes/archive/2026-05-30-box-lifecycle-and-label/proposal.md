## Why

Boxes were implemented with a `status` field but it never changes: a box with 3
items still shows "Leer" (empty), which makes the detail page misleading and
blocks the post-move workflow. Movers also need to read destination rooms at a
glance from the printed label — the current label renders the room too small and
has no visual cues.

## What Changes

- **Auto status tracking**: box status transitions automatically between `empty`
  (0 items) and `packed` (≥1 items) whenever items are added or removed.
- **Delivered state**: a "Mark as Delivered" button on the detail page of a
  `packed` box moves it to `delivered`. This is irreversible via a button
  (unpacking deletes the box).
- **Unpacking flow**: from `delivered`, each item in the box has an inline
  "Place in room" form (room select + submit). A "Unpack all remaining to
  [destination room]" button assigns the destination room to every remaining
  item, removes all items from the box, and then tombstone-deletes the box.
- **Room assignment during unpacking**: if a box in `delivered` state has no
  destination room, an inline section on the detail page lets the user assign
  one before unpacking.
- **Box tombstone deletion**: when a box is deleted after unpacking (or manually
  when empty) a tombstone record is written to KV so the short code is
  permanently retired and historical data is preserved.
- **Label: large room display**: destination room name is rendered in large,
  prominent text at the top of the label — the most important piece of
  information for a mover.
- **Label: room icon**: a Unicode pictogram is derived from keywords in the room
  name (e.g. "Küche" → 🍳, "Schlafzimmer" → 🛏, "Wohnzimmer" → 🛋, "Badezimmer" →
  🚿, "Keller" → 📦, default → 🏠) and displayed alongside the room name.
- **Label: item count badge**: the number of items currently in the box is shown
  as a badge on the label.
- **BREAKING**: `BoxStatus` type changes from
  `"empty" | "packed" |
  "in-transit" | "unpacked"` to
  `"empty" | "packed" | "delivered"`. Existing `in-transit` and `unpacked`
  values are removed (they were never set in production).

## Capabilities

### New Capabilities

_(none — all changes extend the existing boxes capability)_

### Modified Capabilities

- `boxes`: status lifecycle (auto empty/packed, manual delivered, unpack flow
  with tombstone deletion), label improvements (large room, room icon, item
  count)
