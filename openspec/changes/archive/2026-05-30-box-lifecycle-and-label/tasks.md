## 1. Type and model changes

- [x] 1.1 Update `BoxStatus` in `lib/inventory/types.ts`: replace
      `"empty" | "packed" | "in-transit" | "unpacked"` with
      `"empty" | "packed" | "delivered"`.
- [x] 1.2 Add `BoxTombstone` interface to `lib/inventory/types.ts` with fields:
      `id`, `code`, `label`, `destinationRoomId`, `createdAt`, `deletedAt`,
      `reason: "unpacked" | "manual"`.

## 2. boxRepo changes

- [x] 2.1 Write failing unit tests for `updateBoxStatus(boxId)`: verifies that
      calling the function sets status to `"packed"` when items exist and
      `"empty"` when none exist; `"delivered"` is never downgraded.
- [x] 2.2 Implement `updateBoxStatus(boxId: string): Promise<void>` in
      `lib/inventory/boxRepo.ts`: counts items via `listItemsByBox`, then
      atomically patches `box.status` (skip if `delivered`).
- [x] 2.3 Write failing unit tests for `tombstoneDeleteBox`: verifies tombstone
      record is written, live box key is removed, code index key is removed, and
      code counter is unchanged.
- [x] 2.4 Implement
      `tombstoneDeleteBox(box: Box, reason: "unpacked" | "manual")` in
      `lib/inventory/boxRepo.ts`: writes tombstone then atomically deletes
      `["box", id]` and `["box-by-code", code]`.
- [x] 2.5 Replace the existing `deleteBox` usage in routes with
      `tombstoneDeleteBox(box, "manual")`.

## 3. itemRepo — trigger status update on mutations

- [x] 3.1 Write failing integration tests: creating an item with a `boxId`
      changes the box status to `"packed"`; removing the last item changes it
      back to `"empty"`; a `"delivered"` box stays `"delivered"` after item
      removal.
- [x] 3.2 In `createItem`: after committing the item, call
      `updateBoxStatus(input.boxId)` when `boxId` is non-null.
- [x] 3.3 In `updateItem`: after committing the update, call `updateBoxStatus`
      for both the old and new `boxId` (if either is non-null and changed).
- [x] 3.4 In `deleteItem`: after committing the deletion, call
      `updateBoxStatus(item.boxId)` when the item was in a box.

## 4. i18n strings

- [x] 4.1 Add German strings to `lib/i18n/locales/de.ts` for all new UI copy:
  - `boxes.status.delivered` — status label
  - `boxes.action.mark_delivered` — "Als geliefert markieren"
  - `boxes.action.place_item` — "Einlagern"
  - `boxes.action.assign_room` — "Zielraum festlegen"
  - `boxes.action.unpack_all` — "Alle entpacken nach {room}"
  - `boxes.place_item_label` — "In Raum einlagern"
  - `boxes.assign_room_heading` — "Zielraum festlegen"
  - `boxes.label_item_count` — "{count} Gegenstände"

## 5. Box detail page — delivered state UI

- [x] 5.1 Add a "Mark as delivered" form on the box detail page
      (`routes/boxes/[id].tsx`) that is visible only when
      `box.status === "packed"`: POST action `mark_delivered`, single hidden
      `_action` field.
- [x] 5.2 Handle the `mark_delivered` POST action in the route handler: set
      `box.status = "delivered"` via a direct KV update and redirect back to the
      detail page.
- [x] 5.3 When `box.status === "delivered"` and
      `box.destinationRoomId === null`, render an inline "Assign destination
      room" section on the detail page above the item list: a `<select>` of all
      rooms and a submit button (POST action `assign_room`).
- [x] 5.4 Handle the `assign_room` POST action: update `box.destinationRoomId`
      and redirect back.
- [x] 5.5 When `box.status === "delivered"`, replace the per-item "Entfernen"
      button with an inline "place in room" form: a room `<select>` pre-selected
      to the box destination room (if any), and a "Einlagern" submit button
      (POST action `place_item`, hidden field `itemId`).
- [x] 5.6 Handle the `place_item` POST action: set `item.roomId` to the selected
      room and `item.boxId` to `null`, call `updateBoxStatus(boxId)`, then check
      if no items remain — if so, call `tombstoneDeleteBox(box, "unpacked")` and
      redirect to `/boxes`; otherwise redirect back to the detail page.
- [x] 5.7 When `box.status === "delivered"` and `box.destinationRoomId` is set,
      render an "Alle entpacken nach [room]" button at the bottom of the item
      list (POST action `unpack_all`).
- [x] 5.8 Handle the `unpack_all` POST action: for each item in the box set
      `roomId = box.destinationRoomId` and `boxId = null`, then call
      `tombstoneDeleteBox(box, "unpacked")` and redirect to `/boxes`.

## 6. Box detail page — delete uses tombstone

- [x] 6.1 Update the `delete` POST action handler in `routes/boxes/[id].tsx` to
      call `tombstoneDeleteBox(box, "manual")` instead of the old `deleteBox`.
- [x] 6.2 Remove the now-unused `deleteBox` export from
      `lib/inventory/boxRepo.ts` (or keep it as a wrapper for tombstoneDeleteBox
      if referenced elsewhere).

## 7. Label page redesign

- [x] 7.1 Add pure function `getRoomIcon(name: string): string` in
      `routes/boxes/[id]/label.tsx`: keyword map for 8 room types + default 🏠.
- [x] 7.2 Update the label page HTML template in `routes/boxes/[id]/label.tsx`:
  - Room icon + room name as the dominant top element (~48–60px, centered).
  - Short code below (existing style preserved).
  - Label text below short code (if present).
  - Item count badge ("N Gegenstände") below label text.
  - QR code at the bottom.
- [x] 7.3 Update the label CSS in the `<style>` block for the new layout.
- [x] 7.4 Fetch the item count in the label route GET handler
      (`listItemsByBox(box.id).length`) and pass it to the template.

## 8. E2E tests

- [x] 8.1 E2E: add item to a box and verify the box status changes to "packed"
      in both the detail view and the box list.
- [x] 8.2 E2E: click "Als geliefert markieren" on a packed box — status shows
      "Geliefert" on the detail page.
- [x] 8.3 E2E: on a delivered box, use the inline "place item" form to move one
      item to a specific room — item no longer appears in box, appears in room
      view.
- [x] 8.4 E2E: on a delivered box with destination room, click "Alle entpacken
      nach [room]" — box disappears from `/boxes`, items appear in the room's
      item list.
- [x] 8.5 E2E: on a delivered box with NO destination room — verify "Alle
      entpacken" is NOT shown and the inline assign-room section IS shown;
      assign room; verify "Alle entpacken" then appears.
- [x] 8.6 E2E: label page shows room icon + large room name + item count badge.

## 9. Wrap-up

- [x] 9.1 Run `openspec validate box-lifecycle-and-label` — no warnings.
- [x] 9.2 Run `deno task check` and `deno task test` — all green.
