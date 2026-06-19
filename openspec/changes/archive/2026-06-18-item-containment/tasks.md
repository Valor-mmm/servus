## 1. Types & data model

- [x] 1.1 Add `canContain: boolean` to `Category` and
      `containerId: string | null` to `Item` in `lib/inventory/types.ts`
- [x] 1.2 Write the one-shot migration script backfilling `canContain: false` on
      all categories and `containerId: null` on all items; add it under the
      project's migration location

## 2. Category repo & schema flag

- [x] 2.1 Failing test: creating a category defaults `canContain` to `false`;
      creating/editing with the flag persists `true`; setting
      `canContain: false` on a category whose items have contents is rejected
- [x] 2.2 Thread `canContain` through category create/edit repo functions and
      validation; guard the false-flip against occupied containers

## 3. Containment in the item repo

- [x] 3.1 Failing test: setting `containerId` writes the `item-by-container`
      index entry and `listItemsByContainer` returns the contents
- [x] 3.2 Add `item-by-container` index maintenance to create/update/delete
      inside the existing atomic transactions; add `listItemsByContainer`
- [x] 3.3 Failing test + impl: assigning a container whose category has
      `canContain: false` is rejected (boundary validation)
- [x] 3.4 Failing test + impl: cycle guard rejects self-containment and
      descendant-as-container (walk candidate chain to root)
- [x] 3.5 Failing test + impl: placing an item into a container clears stored
      `roomId` to `null` and drops its room index entries atomically
- [x] 3.6 Failing test + impl: deleting a container item clears `containerId` on
      its direct children; if a replacement `roomId` was supplied, sets it on
      them — all atomic with the deletion (children become room-less if no room
      supplied)

## 4. Room derivation

- [x] 4.1 Failing test + impl: `resolveRoom(item)` walks the chain to the root
      and returns the root's `roomId`
- [x] 4.2 Failing test + impl: `listItemsByRoom` includes items whose root
      resolves to that room (direct items plus contained subtrees)

## 5. Create & edit forms (room locking)

- [x] 5.1 Add a lazy-loading accordion container selector to the item create and
      edit forms: grouped by room (one panel per room + one "no room" panel),
      each panel fetches only when expanded, searchable by name across all
      rooms; only container-capable items (`canContain: true`) are offered
- [x] 5.2 Lock the room field and show the derived-room read-only hint when a
      container is selected; clearing the container unlocks the room field empty
- [x] 5.3 Wire create/edit handlers to persist `containerId` and enforce the
      room-null + validation rules server-side
- [x] 5.4 Enforce box/container mutual exclusion in forms (selecting one clears
      and disables the other) and in the server handler (reject submissions with
      both set)

## 6. Container detail & contents view

- [x] 6.1 On a container-capable item's detail page, render its direct contents
      list
- [x] 6.2 Render the location breadcrumb resolving the chain up to the room
      (e.g. "Flur → A → B")
- [x] 6.3 Show an empty-container state when nothing is inside
- [x] 6.4 On any item detail page with a `containerId`, show a "contained in: X"
      indicator and the breadcrumb chain (applies regardless of whether the item
      is itself a container)
- [x] 6.5 Add a deletion confirmation dialog for non-empty containers: warn with
      item count, offer a room selector pre-filled with the container's current
      derived room; if accepted wire the chosen room to the delete handler; if
      declined proceed with deletion leaving children room-less

## 7. Container label page

- [x] 7.1 Add a container label route mirroring `/boxes/:id/label`: name + QR to
      the item-detail URL, print CSS, screen-only toolbar; add a link/button to
      this label route on the container item's detail page
- [x] 7.2 Failing test: the label markup contains the name and QR but does not
      list contents

## 8. i18n

- [x] 8.1 Add German keys for: container field label, derived-room hint,
      can-contain category option, contents heading, empty-container state,
      "contained in" indicator, deletion warning dialog (item count, room
      assignment offer), and label page; wire all new copy through `t()`

## 9. E2E

- [x] 9.1 Playwright scenario: mark a category container-capable, create a
      container item in a room, place an item inside it (room field locks),
      verify the contained item resolves into the room view and appears in the
      container's contents
- [x] 9.2 Playwright scenario: open the container label page, assert name + QR
      present and contents absent, and that scanning the QR target opens the
      item detail
