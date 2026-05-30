## 1. Types and Repository

- [x] 1.1 Add `quantity: number` to the `Item` interface in
      `lib/inventory/types.ts`
- [x] 1.2 Update `CreateItemInput` and `UpdateItemInput` in `itemRepo.ts` to
      include `quantity?: number`
- [x] 1.3 Add quantity coerce-at-read to `findItem` and `listItems` (undefined
      → 1)
- [x] 1.4 Wire `quantity` into `createItem` (default 1) and `updateItem`

## 2. Unit Tests

- [x] 2.1 Write failing unit test: `createItem` without quantity stores
      `quantity: 1`
- [x] 2.2 Write failing unit test: `createItem` with `quantity: 6` stores
      `quantity: 6`
- [x] 2.3 Write failing unit test: legacy record (no quantity field) reads back
      as `quantity: 1`
- [x] 2.4 Write failing unit test: `updateItem` persists changed quantity
- [x] 2.5 Make all unit tests pass

## 3. i18n

- [x] 3.1 Add keys to `lib/i18n/locales/de.ts`: `items.quantity_label`,
      `items.error.quantity_invalid`

## 4. Item Create Form

- [x] 4.1 Add quantity `<input type="number" name="quantity" min="1" value="1">`
      to `routes/items/new.tsx`
- [x] 4.2 Add server-side validation in POST handler: parse quantity, reject <
      1, pass to `createItem`

## 5. Item Edit Form

- [x] 5.1 Add quantity input to `routes/items/[id]/edit.tsx`, pre-filled with
      current value
- [x] 5.2 Add server-side validation in POST handler: parse quantity, reject <
      1, pass to `updateItem`

## 6. Item List View

- [x] 6.1 Show quantity in each row of `routes/items/index.tsx` (alongside name,
      category, room)

## 7. Box Detail View

- [x] 7.1 Show quantity in each item row in `routes/boxes/[id].tsx`

## 8. Integration Tests

- [x] 8.1 Write failing integration test: create item with `quantity: 3` via
      repo, verify KV stores `quantity: 3`
- [x] 8.2 Write failing integration test: update item quantity from `1` to `5`,
      verify stored value
- [x] 8.3 Write failing integration test: quantity `0` rejected by route handler
      (returns validation error)
- [x] 8.4 Make all integration tests pass

## 9. E2E

- [x] 9.1 Playwright: create item with explicit quantity via UI, verify quantity
      shown in item list
- [x] 9.2 Playwright: edit item quantity via UI, verify updated quantity shown
- [x] 9.3 Playwright: add item with quantity > 1 to a box, verify quantity shown
      in box detail
- [x] 9.4 Playwright: attempt to set quantity to 0, verify error message is
      shown
