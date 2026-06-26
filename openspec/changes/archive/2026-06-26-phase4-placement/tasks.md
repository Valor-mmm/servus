## 1. Placement picker (3a)

- [x] 1.1 Add `.standort-picker`, `.standort-radio`, `.standort-panel` CSS to
      `static/styles.css`; panels hidden by default, shown via `:checked` +
      sibling selector
- [x] 1.2 Create `components/StandortPicker.tsx` (or inline in edit form):
      renders the segmented radio + three panels (room select, box select,
      container select); accepts current `roomId`, `boxId`, `containerId`,
      `rooms`, `boxes`, `containerItems` as props; pre-checks the correct radio
- [x] 1.3 Replace the three separate placement fields in
      `routes/items/[id]/edit.tsx` and any shared item form component with
      `<StandortPicker …/>`
- [x] 1.4 In the POST handler for item edit: read `standort_type` from form
      body; set only the matching placement ID field in `UpdateItemInput`; clear
      the other two (pass `null`)
- [x] 1.5 Add i18n keys: `"items.standort"`, `"items.standort.room"`,
      `"items.standort.box"`, `"items.standort.container"` to `de.ts`
- [x] 1.6 Unit test: POST with `standort_type=box` and a `boxId` → `roomId` and
      `containerId` are null on the saved item

## 2. Einpacken (3b)

- [x] 2.1 In `routes/boxes/[id].tsx` GET handler: fetch all items where
      `boxId === null` (use `listItems()` and filter); pass as `unpackedItems`
      to page props
- [x] 2.2 Add `<details class="einpacken-section">` block to the box detail
      page: checkbox list of `unpackedItems`; submit button "Einpacken"
- [x] 2.3 Add POST branch in `routes/boxes/[id].tsx` handler for
      `_action = "einpacken"`: read checked item IDs from form body, call
      `updateItem(id, { boxId })` for each, redirect back to `/boxes/[id]`
- [x] 2.4 Add i18n key `"boxes.einpacken"`, `"boxes.einpacken_heading"`,
      `"boxes.einpacken_empty"` to `de.ts`
- [x] 2.5 Unit test: POST einpacken assigns correct `boxId` to each selected
      item

## 3. Tests and E2E

- [x] 3.1 Run `deno task test` — all pass
- [x] 3.2 E2E: open item edit form → only one placement panel visible; switch
      radio → different panel shown; save → correct placement stored, others
      cleared
- [x] 3.3 E2E: open box detail → Einpacken section visible; check item → submit
      → item appears in box list
- [x] 3.4 Run `deno task e2e` — all pass
