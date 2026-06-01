## Why

The current photo-capture flow creates one item per photo. If you want to attach
a second shot of the same object (e.g. front + back of a blender, or the serial
number sticker on a TV), you have to: finish the capture, navigate to the item
list, find the new pending item, open its edit page, and tap "Foto aufnehmen"
again. On a phone mid-packing this is four too many taps.

The data model already supports `photos: string[]` with multiple keys per item,
and the item-edit page already has `append` mode. The gap is purely in the
creation flow: after the first photo lands, the island immediately reloads and
the chance to add more photos is gone.

## What Changes

- **`PhotoCapture` island — post-create state**: after the first photo creates a
  new item (`create-from-photo`), instead of reloading immediately, the island
  transitions into an inline "add more photos" state. A second button lets the
  user either capture another photo (appended to the same item via
  `append-photo`) or tap "Fertig" to reload and see the result.
- **No new API endpoints** — `append-photo` already exists; the island just
  holds the newly created `itemId` in local state and switches its mode.
- **No spec changes** — the `inventory` and `photos` specs already say an item
  can have multiple photo keys. This is purely a UI change to make that
  capability reachable without leaving the capture screen.
- **Quick-add page** (`/items/quick-add`) gets the same improvement: after the
  first photo the island stays open to accept more photos for the same item.
- **Box detail page** — same: `PhotoCapture` mounted with `boxId` now stays open
  for additional photos before committing.

## Non-goals

- Selecting multiple photos from the camera roll in a single picker — the
  `capture="environment"` input opens the camera directly on mobile; multi-file
  selection there is inconsistent across browsers.
- A dedicated "photo session" page or route — everything stays within the
  existing island.
- Reordering photos in the creation flow — reorder on the edit page.

## Design Notes

**State machine in the island**

```
idle
  → [photo selected] → uploading
uploading
  → [success, mode=create] → created(itemId)
  → [success, mode=append] → done → reload
  → [error] → idle (shows error)
created(itemId)
  → [user taps "Weiteres Foto"] → uploading (append to same itemId)
  → [user taps "Fertig"] → reload
```

The island gains a `createdItemId` signal (initially `null`). When
`create-from-photo` returns `201`, the response body contains the new item's
`id`; the island stores it and renders two buttons: "Weiteres Foto" (which
triggers another file-input click) and "Fertig" (which calls
`location.reload()`). Subsequent uploads go to `append-photo` with that id.

**`create-from-photo` response body**: the endpoint already returns the full
item JSON (checked — `routes/api/items/create-from-photo.ts` returns
`Response.json(item, { status: 201 })`). The island can read `item.id` from it.

## Spec Deltas

None — the `inventory` spec already specifies multi-photo items. No new
requirements are introduced.

## Task List

### 1. Island — post-create multi-photo state (TDD)

- [ ] 1.1 Update the `PhotoCapture` island: after a successful `create`, parse
      the response body to extract `itemId`, store in a `createdItemId` signal,
      and render "Weiteres Foto" + "Fertig" buttons instead of reloading.
      Subsequent captures while `createdItemId` is set go to `append-photo`.
- [ ] 1.2 Update unit test `tests/unit/photos/photoCapture.test.ts` (or add a
      new test file) to cover the state transition: simulate a successful
      create, assert `createdItemId` is populated, simulate a second capture,
      assert `append-photo` is called with the stored id, simulate "Fertig",
      assert reload is triggered.

### 2. i18n

- [ ] 2.1 Add German copy to `lib/i18n/locales/de.ts`: `items.addAnotherPhoto`
      (`"Weiteres Foto"`), `items.captureFinished` (`"Fertig"`).

### 3. End-to-end Playwright

- [ ] 3.1 `tests/e2e/photos/multi-photo-capture.spec.ts`: log in → open a box
      detail page → capture a photo → assert the "Weiteres Foto" and "Fertig"
      buttons appear → capture a second photo → tap "Fertig" → assert the box
      detail shows one item (not two) with two thumbnails visible on its edit
      page (navigate to `/items/<id>/edit` and count `<img class="item-photo">`
      elements).
