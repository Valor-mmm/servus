## 1. Domain types

- [x] 1.1 Add `Box` type to `lib/inventory/types.ts`: `id`, `code` (e.g.
      `"B-001"`), `label` (nullable string), `destinationRoomId` (nullable),
      `status` (`"empty" | "packed" | "in-transit" | "unpacked"`), `createdAt`,
      `updatedAt`.
- [x] 1.2 Extend the `Item` type in `lib/inventory/types.ts` with a nullable
      `boxId` field. Verify that existing unit tests still compile and pass
      after the type change.

## 2. Box repository — unit tests + implementation

- [x] 2.1 Write failing unit tests for `lib/inventory/boxRepo.ts`: create box
      (auto-assigns next sequential code, status `"empty"`), find by id, find by
      code, list all with item count, update label and destination room, set and
      clear destination room, delete empty box, reject delete when items are
      assigned, sequential code uniqueness under concurrent creates (retry
      loop).
- [x] 2.2 Implement `lib/inventory/boxRepo.ts` with `createBox`, `findBox`,
      `findBoxByCode`, `listBoxes` (includes item count from `item-by-box`
      index), `updateBox`, `deleteBox`. Use `["box-code-counter"]` KV key with
      an optimistic-lock retry loop for sequential code assignment. Use
      `kv.atomic()` for all mutations.

## 3. Item repository — extend for box assignment

- [x] 3.1 Write failing unit tests for the updated `itemRepo`: create item with
      `boxId` (verify `roomId` null), update item to assign box (verify `roomId`
      cleared and `item-by-box` index updated), update item to clear box (verify
      index removed), update item to assign room (verify `boxId` cleared),
      verify `listItemsByBox` prefix scan reflects create/update/ delete
      correctly.
- [x] 3.2 Update `lib/inventory/itemRepo.ts`: add `boxId` field handling to
      `createItem`, `updateItem`, and `deleteItem`. Enforce the `boxId`/`roomId`
      mutual-exclusion atomically. Add and remove
      `["item-by-box", boxId,
      itemId]` index entries in every mutation
      that touches `boxId`.

## 4. i18n strings

- [x] 4.1 Add all German strings for boxes to `lib/i18n/locales/de.ts`: page
      titles, field labels (`Karton`, `Code`, `Beschriftung`, `Zielraum`,
      `Status`), placeholders, validation messages (non-empty box), bulk-add
      textarea placeholder and result summary, unbox confirm text, empty-state
      messages, label-page heading.

## 5. QR code dependency

- [x] 5.1 Add `npm:qrcode` (pinned to a specific version) to `deno.json`
      imports. Verify it produces an SVG string for a sample URL in a throwaway
      Deno script (`deno run --allow-net`) before wiring it into routes.

## 6. Box routes

- [x] 6.1 Implement `routes/boxes/index.tsx` — list all boxes (code, label,
      destination room, status, item count); form to create a new box (optional
      label, optional destination room select, POST with CSRF); link to each
      box's detail page.
- [x] 6.2 Implement `routes/boxes/[id].tsx` — detail view: short code, label,
      destination room, status; list of assigned items (name + category) each
      with a remove/unbox button (POST with CSRF); bulk-add textarea (POST with
      CSRF); delete button (only shown when item count = 0, POST with CSRF);
      link to edit page and label page.
- [x] 6.3 Implement `routes/boxes/[id]/edit.tsx` — GET renders edit form
      pre-filled with label and destination room (dropdown of all rooms); POST
      updates box and redirects to `/boxes/:id`.
- [x] 6.4 Implement `routes/boxes/[id]/label.tsx` — server-renders a
      print-optimised page: inline SVG QR code (full URL of `/boxes/:id`), short
      code in large text, label text (if set), destination room name (if set).
      Apply print-only CSS via `<style>` block. No navigation chrome.

## 7. Bulk-add handler

- [x] 7.1 Add a `POST /boxes/:id/items` handler (co-located in
      `routes/boxes/[id].tsx`): parse textarea (split on newlines and commas,
      trim, skip blanks), create each as a new item with `boxId` set and
      `categoryId: null`, batch mutations into atomic commits of ≤ 3 items each,
      redirect back to `/boxes/:id` with a flash summary count.

## 8. Unbox handler

- [x] 8.1 Add a `POST /boxes/:id/items/:itemId/remove` handler (co-located in
      `routes/boxes/[id].tsx`): call `itemRepo.updateItem` with `boxId: null`,
      verify CSRF token, redirect back to `/boxes/:id`.

## 9. Item routes — box assignment

- [x] 9.1 Update `routes/items/new.tsx` — add a box selector (dropdown of all
      boxes) to the create form; POST handler passes `boxId` to `createItem`.
- [x] 9.2 Update `routes/items/[id]/edit.tsx` — add a box selector and a
      destination room selector; enforce the `roomId`/`boxId` mutual-exclusion
      in the HTML (selecting one clears the other via a small `<script>` block
      or a server-side validation); POST handler passes updated `boxId` or
      `roomId` to `updateItem`.
- [x] 9.3 Update `routes/items/[id].tsx` — detail view shows box assignment
      (short code + label) when `boxId` is set, or room when `roomId` is set.

## 10. Navigation

- [x] 10.1 Add a "Kartons" link to the app layout (`routes/_app.tsx`) pointing
      to `/boxes`.

## 11. Integration tests

- [x] 11.1 Write integration tests for `boxRepo`: sequential code uniqueness
      across concurrent creates (retry loop), `listBoxes` item count is accurate
      after item assignment changes, delete rejection when items are assigned,
      destination room set/clear.
- [x] 11.2 Write integration tests for `itemRepo` box-assignment path:
      `listItemsByBox` prefix scan reflects correct state after create, update
      (box change, box cleared, room assigned), and delete.

## 12. Playwright E2E

- [x] 12.1 E2E: create a box with a label and destination room — box appears in
      the list with code `B-001` (or next), label, room, and item count 0.
- [x] 12.2 E2E: bulk-add three item names to a box — all three appear in the box
      detail view; each item's detail page shows the box assignment.
- [x] 12.3 E2E: open the label page for a box — QR code SVG is present, short
      code text visible, label text visible, destination room visible.
- [x] 12.4 E2E: unbox an item from the box detail page — item no longer appears
      in the box, item still exists in the item list with no box assignment.
- [x] 12.5 E2E: assign an existing item (with a room) to a box via the item edit
      form — item's room is cleared, item appears in the box detail.
- [x] 12.6 E2E: attempt to delete a non-empty box — error is shown and box
      persists in the list.
- [x] 12.7 E2E: delete an empty box — box no longer appears in the list.

## 13. Wrap-up

- [x] 13.1 Run `openspec validate add-boxes-and-codes` and confirm no warnings.
- [x] 13.2 Run `deno task check` and `deno task test` — all green.
