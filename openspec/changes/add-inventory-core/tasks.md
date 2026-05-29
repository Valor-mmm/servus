## 1. Domain types

- [ ] 1.1 Create `lib/inventory/types.ts` with `Category`, `Room`, and `Item`
      types. `Item` includes `id`, `name`, `categoryId`, `roomId` (nullable),
      `estimatedValue` (nullable number), `photoKey` (nullable), `status`
      (`"pending" | "suggested" | "confirmed"`), `createdAt`, `updatedAt`.

## 2. Category repository

- [ ] 2.1 Write failing unit tests for `lib/inventory/categoryRepo.ts`:
      create category, find by id, list all, delete unused, reject duplicate
      name, reject delete when items reference the category.
- [ ] 2.2 Implement `lib/inventory/categoryRepo.ts` with `createCategory`,
      `findCategory`, `listCategories`, `deleteCategory`.

## 3. Room repository

- [ ] 3.1 Write failing unit tests for `lib/inventory/roomRepo.ts`:
      create room, find by id, list all, delete unused, reject duplicate name,
      reject delete when items reference the room.
- [ ] 3.2 Implement `lib/inventory/roomRepo.ts` with `createRoom`, `findRoom`,
      `listRooms`, `deleteRoom`.

## 4. Item repository

- [ ] 4.1 Write failing unit tests for `lib/inventory/itemRepo.ts`: create
      item (sets `status:"confirmed"`, `photoKey:null`), find by id, list all,
      update (name / category / room / value), delete — verifying that category
      and room indexes are maintained atomically in all mutation cases.
- [ ] 4.2 Implement `lib/inventory/itemRepo.ts` with `createItem`, `findItem`,
      `listItems`, `listItemsByCategory`, `listItemsByRoom`, `updateItem`,
      `deleteItem`. Use `kv.atomic()` for all index-touching mutations.

## 5. i18n strings

- [ ] 5.1 Add all German strings for items, categories, and rooms to
      `lib/i18n/locales/de.ts`: page titles, labels, placeholders, validation
      messages, confirmation prompts, empty-state messages.

## 6. Category routes

- [ ] 6.1 Implement `routes/categories/index.tsx` — list all categories, form
      to add a new one (POST), delete button per category (POST with CSRF).
      Show error if name is duplicate or deletion is blocked.

## 7. Room routes

- [ ] 7.1 Implement `routes/rooms/index.tsx` — list all rooms, form to add a
      new one (POST), delete button per room (POST with CSRF).
      Show error if name is duplicate or deletion is blocked.

## 8. Item routes

- [ ] 8.1 Implement `routes/items/index.tsx` — list view with server-side
      search (name substring, case-insensitive) and filter by category and room
      via query params. Each item shows name, category, room.
- [ ] 8.2 Implement `routes/items/new.tsx` — GET renders create form (category
      select, optional room select, optional estimated value); POST creates item
      and redirects to `/items`.
- [ ] 8.3 Implement `routes/items/[id].tsx` — detail view showing all item
      fields; links to edit and delete (POST with CSRF).
- [ ] 8.4 Implement `routes/items/[id]/edit.tsx` — GET renders edit form
      pre-filled with current values; POST updates item and redirects to
      `/items/:id`.

## 9. Navigation

- [ ] 9.1 Add links to Items, Categories, and Rooms in the app layout
      (`routes/_app.tsx`) so they are reachable from every page.

## 10. Integration tests

- [ ] 10.1 Write integration tests for `itemRepo` covering index consistency:
      verify `listItemsByCategory` and `listItemsByRoom` reflect the correct
      state after create, update (category change, room change, room cleared),
      and delete.

## 11. Playwright E2E

- [ ] 11.1 E2E scenario: create a category, create a room, create an item
      assigned to both — item appears in the list and in filtered views.
- [ ] 11.2 E2E scenario: edit an item's category — old category filter no
      longer shows the item; new category filter does.
- [ ] 11.3 E2E scenario: delete an item — item no longer appears in the list.
- [ ] 11.4 E2E scenario: attempt to delete a category in use — error is shown
      and category persists.
- [ ] 11.5 E2E scenario: search by name — only matching items are shown.

## 12. Wrap-up

- [ ] 12.1 Run `openspec validate add-inventory-core` and confirm no warnings.
- [ ] 12.2 Run `deno task check` and `deno task test` — all green.
