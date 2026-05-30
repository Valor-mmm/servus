## Why

With inventory items cataloged, the next move-blocking capability is physical
containers: users must assign items to labeled boxes so they know what's packed
where, and a scannable code on each box must open its contents list on a phone
at the destination. Without this, the move devolves into unlabeled boxes and
manual searching.

## What Changes

- Introduce the **Box** entity: a physical container with a generated ID, a
  short human-readable code (e.g. `B-042`), an optional label, an optional
  destination room (`destinationRoomId`), and a lifecycle status (`empty` |
  `packed` | `in-transit` | `unpacked`).
- Items gain a **`boxId`** field (nullable). Assigning an item to a box clears
  its direct `roomId` — the box owns the item's location while packed.
- **Printable label page** at `/boxes/:id/label`: renders a QR code pointing to
  `/boxes/:id`, the short code in large text, the optional label text, and the
  destination room (if assigned), formatted for print with no navigation chrome.
- **Bulk-add items to a box**: from the box detail page, a textarea accepts a
  comma-separated or one-per-line list of item names; each name creates a new
  item (no matching against existing items) assigned to the box.
- **Unbox items from the box detail page**: a remove button per item row on
  `/boxes/:id` clears the item's box assignment without deleting the item.
- Full CRUD UI for boxes: create (auto-assigns next sequential code), view
  contents, edit label and destination room, delete (only when empty).
- All user-visible strings go through the `t()` helper (German locale).

## Capabilities

### New Capabilities

- `boxes`: Create, read, update, and delete boxes with auto-incrementing short
  codes, optional labels, an optional destination room, and a four-state
  lifecycle status. Items can be assigned to a box; the box owns the item's
  location while it is packed. Items can be removed from a box directly on the
  box detail page. A printable/scannable label page shows the QR code, short
  code, label, and destination room.

### Modified Capabilities

- `inventory`: Items gain a nullable `boxId`; assigning an item to a box MUST
  atomically clear `roomId`, and removing an item from a box MUST restore a
  nullable `roomId`. The item list and detail views must reflect the box
  assignment.

## Impact

- **New routes**: `/boxes` (list + create), `/boxes/:id` (detail + bulk-add +
  unbox + delete), `/boxes/:id/edit` (label + destination-room edit),
  `/boxes/:id/label` (printable QR label).
- **Modified routes**: `/items/:id` and `/items/:id/edit` expose the box
  assignment and handle the roomId/boxId mutual-exclusion.
- **New lib module**: `lib/inventory/boxRepo.ts` — CRUD + short-code
  auto-increment using a KV counter key.
- **Modified lib module**: `lib/inventory/itemRepo.ts` — `createItem`,
  `updateItem`, and `deleteItem` must handle the new `boxId` field and its
  index, and enforce the boxId/roomId mutual-exclusion atomically.
- **KV layout additions**: primary `["box", id]`; index `["box-by-code", code]`
  for unique-code lookup; counter `["box-code-counter"]` for sequential code
  generation; item index `["item-by-box", boxId, itemId]`.
- **New dependency**: a QR-code renderer for the label page. Must be a small,
  stable, zero-build-step library. [`qrcode`](https://deno.land/x/qrcode) (Deno
  port, ~2 kB, stable since 2021) or equivalent SVG/canvas generator. No
  server-side image generation needed — an inline SVG approach avoids any binary
  dependency entirely.
- **Non-goals**: weight/dimension tracking, photo of box contents, status
  transitions (those belong to M5 moving-flow), multi-box bulk move.
