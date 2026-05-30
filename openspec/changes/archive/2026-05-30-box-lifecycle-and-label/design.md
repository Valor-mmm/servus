## Context

Boxes were introduced in `add-boxes-and-codes`. The `BoxStatus` type includes
four values (`empty | packed | in-transit | unpacked`) but status transitions
were never implemented — every box stays `empty` forever. The label page renders
the destination room in small text at the bottom, making it hard for movers to
identify at a glance.

## Goals / Non-Goals

**Goals:**

- Auto-derive `empty`/`packed` from item count on every item mutation.
- Add `delivered` status with a manual trigger.
- Implement the unpack flow: per-item room placement + bulk "unpack all
  remaining" that tombstone-deletes the box.
- Inline room assignment on the detail page when the box has no destination room
  (server-rendered, no JS modal).
- Redesign the label page so destination room is the dominant visual element,
  with a room icon and item count badge.
- Tombstone record written on every box deletion (manual or post-unpack) so
  short codes are never reused.

**Non-Goals:**

- Push notifications, real-time sync between movers, or offline support.
- Image upload on items.
- Undo of delivered/unpack transitions.
- Saving delivery timestamps or delivery history.

## Decisions

### 1. Status derivation: computed on write vs. stored field

**Decision:** Update `box.status` on every item mutation that touches `boxId`
(create, update, delete). Use `listItemsByBox` count after the mutation and
atomically patch the box's status.

**Alternative considered:** Derive status at read time from item count. Rejected
because it requires a KV list on every box read and makes the list page
expensive (already queries item-by-box index per box for count).

**Why stored:** Status is already a stored field in the Box record; updating it
on write keeps reads cheap and is consistent with how `itemCount` is already
handled in `BoxWithItemCount`.

### 2. Status type change

**Decision:** Replace `"in-transit" | "unpacked"` with `"delivered"` only. The
new type is `"empty" | "packed" | "delivered"`.

**Why:** `in-transit` and `unpacked` were placeholders never set by any code
path. Removing them avoids dead code. `delivered` covers the user's described
workflow. There is no persistent `unpacking` status — the `delivered` state IS
the unpacking state (items are placed one by one until "unpack all remaining"
completes the box).

### 3. Unpack flow implementation

**Decision:** The `delivered` detail page shows each item with an inline "Place
in room" form (POST action `place_item`). A second form at the bottom provides
"Unpack all remaining to [room]" (POST action `unpack_all`). Both actions:

- Remove items from the box (set `boxId = null`, `roomId = selected room`).
- After `unpack_all` (or after the last item is individually placed): call
  `tombstoneDeleteBox`, which writes a `["box-tombstone", id]` KV record then
  atomically deletes the live box record.

**Why no separate `unpacking` status:** Simpler state machine, fewer routes and
form actions. The delivered page already shows items; adding "place in room"
per-item is a natural extension.

### 4. Tombstone schema

```
key: ["box-tombstone", box.id]
value: {
  id: string,
  code: string,
  label: string | null,
  destinationRoomId: string | null,
  createdAt: number,
  deletedAt: number,
  reason: "unpacked" | "manual"
}
```

Tombstones are never shown in the UI. The `["box-by-code", code]` index entry is
also deleted on tombstone so code lookups return null, but the counter is never
decremented, ensuring no code reuse.

### 5. Inline room assignment (no JS modal)

**Decision:** When a `delivered` box has `destinationRoomId = null`, render an
inline "Assign destination room" section on the detail page above the item list.
This is a standard HTML form with a room `<select>` and submit button (POST
action `assign_room`). After assignment, the page redirects back to the same
detail page.

**Why not a separate edit page:** Avoids a round-trip through `/boxes/:id/edit`
and keeps the unpacking context intact.

### 6. Label page redesign

Layout (top to bottom):

1. **Room icon + room name** — dominant, ~48–60px font, centered, with a Unicode
   pictogram derived from the room name via a keyword map.
2. **Short code** — large monospace (existing style, preserved).
3. **Label text** — medium text (if present).
4. **Item count badge** — "N Gegenstände" in a pill badge.
5. **QR code** — same SVG, placed below text content.

Room icon keyword map (first match wins, case-insensitive):

| Keyword                  | Icon |
| ------------------------ | ---- |
| küche / kueche / kitchen | 🍳   |
| schlaf / bedroom         | 🛏    |
| wohn / living            | 🛋    |
| bad / bath / dusch       | 🚿   |
| keller / lager / storage | 📦   |
| büro / office            | 💼   |
| kind / child / baby      | 🧸   |
| garten / garden / balkon | 🌿   |
| _(default)_              | 🏠   |

Implemented in a pure function `getRoomIcon(name: string): string` in the label
route (no separate file needed).

## Risks / Trade-offs

- **Status drift**: if a bug prevents the status patch from being written
  atomically with the item mutation, status can become stale. Mitigation: keep
  the status update inside the same `kv.atomic()` call as the item mutation.
- **Tombstone orphans**: if the app crashes between writing the tombstone and
  deleting the live box record, a live box and a tombstone can co-exist.
  Mitigation: write tombstone FIRST then delete box in the same `kv.atomic()`;
  at worst the tombstone is there but the box is still visible and functional.
- **Unpack all with no destination room**: if `box.destinationRoomId` is null
  and the user presses "unpack all", the system needs a room. Mitigation: the
  "unpack all" button is not shown until a destination room is assigned (the
  inline assignment section appears instead).
