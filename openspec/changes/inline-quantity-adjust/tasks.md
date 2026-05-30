## 1. i18n

- [x] 1.1 Add keys to `lib/i18n/locales/de.ts`: `items.qty_dec` (−),
      `items.qty_inc` (+), aria-labels for both buttons

## 2. Item Repo Helper

- [x] 2.1 Write failing unit test: `adjustQuantity(id, +1)` increments stored
      quantity
- [x] 2.2 Write failing unit test: `adjustQuantity(id, -1)` decrements stored
      quantity (floor 1)
- [x] 2.3 Write failing unit test: `adjustQuantity(id, -1)` when quantity is 1
      is a no-op
- [x] 2.4 Add `adjustQuantity(id: string, delta: 1 | -1): Promise<Item>` to
      `lib/inventory/itemRepo.ts`
- [x] 2.5 Make unit tests pass

## 3. Item List View

- [x] 3.1 Add POST handler to `routes/items/index.tsx` for `_action=qty_inc` and
      `_action=qty_dec`
- [x] 3.2 Add `−`/`+` form buttons to each item row in the item list (preserve
      active filters in redirect)

## 4. Box Detail View

- [x] 4.1 Add `qty_inc` and `qty_dec` cases to the POST handler in
      `routes/boxes/[id].tsx`
- [x] 4.2 Add `−`/`+` form buttons to each item row in box detail (only when box
      is not `"delivered"`)

## 5. Integration Tests

- [x] 5.1 Write failing integration test: POST `qty_inc` to `/items` increments
      quantity and redirects
- [x] 5.2 Write failing integration test: POST `qty_dec` to `/items` decrements
      quantity (floor 1)
- [x] 5.3 Make integration tests pass

## 6. E2E

- [x] 6.1 Playwright: press `+` on item row in item list — quantity increments
- [x] 6.2 Playwright: press `−` on item row in item list — quantity decrements
- [x] 6.3 Playwright: press `−` when quantity is 1 in item list — quantity stays
      1
- [x] 6.4 Playwright: press `+` on item row in box detail — quantity increments
- [x] 6.5 Playwright: press `−` on item row in box detail — quantity decrements
- [x] 6.6 Playwright: delivered box shows no `+`/`−` buttons on item rows
