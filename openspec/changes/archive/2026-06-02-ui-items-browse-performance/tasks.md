## 1. Confirm KV data state

- [x] 1.1 Ask the user whether any real data has been added to KV since
  2026-06-02; proceed only after confirmation that it is still test-only (or
  that a migration script will run before deploy)

## 2. Time-ordered index — repository layer

- [x] 2.1 Write failing unit tests for `createItem()`: assert that after
  creation a `["item-by-time", createdAt, id]` key exists in KV with value
  `true`
- [x] 2.2 Write failing unit tests for `deleteItem()`: assert that after
  deletion the `["item-by-time", createdAt, id]` key is removed from KV
- [x] 2.3 Add `TIME_IDX_KEY` helper and update `createItem()` to add the time
  index entry to the existing atomic operation
- [x] 2.4 Update `deleteItem()` to include the time index delete in the atomic
  operation using `item.createdAt`
- [x] 2.5 Run unit tests — all pass

## 3. New repository functions

- [x] 3.1 Write failing unit tests for `listItemsRecent(limit)`: verify newest
  first ordering, limit is respected, partial list when count < limit
- [x] 3.2 Write failing unit tests for `countItems()`: verify correct count with
  N items, returns 0 for empty KV
- [x] 3.3 Implement `listItemsRecent(limit: number): Promise<Item[]>` in
  `itemRepo.ts` using `kv.list({ prefix: ["item-by-time"], limit, reverse: true })`
- [x] 3.4 Implement `countItems(): Promise<number>` in `itemRepo.ts` using a
  key-only prefix scan on `["item"]`
- [x] 3.5 Run unit tests — all pass

## 4. Route handler — filter-aware dispatch

- [x] 4.1 Write failing integration tests for `GET /items` covering each load
  strategy branch: no params, `?all=1`, `?cat=X`, `?room=Y`, `?q=text`,
  `?q=text&cat=X`
- [x] 4.2 Refactor `routes/items/index.tsx` handler to implement the dispatch
  table from the design doc; replace the single `listItems()` call
- [x] 4.3 Run integration tests — all pass

## 5. Browse limit UI

- [x] 5.1 Write a failing integration test: with >50 items and no params, page
  HTML contains the count note and "Alle Gegenstände laden" link
- [x] 5.2 Write a failing integration test: with `?all=1`, neither element is
  present
- [x] 5.3 Add `countItems()` call to the no-params branch of the route handler
- [x] 5.4 Add German i18n keys for the count note and "Alle Gegenstände laden"
  to `lib/i18n/locales/de.ts`
- [x] 5.5 Render the count note and "Alle Gegenstände laden" button in the route
  template, gated on the limited-view condition
- [x] 5.6 Run integration tests — all pass

## 6. Filter form — auto-submit and search button

- [x] 6.1 Write a failing E2E step (or integration assertion) that the category
  dropdown has `data-autosubmit` and no standalone Filtern button (handled via
  app-init.js auto-submit handler)
- [x] 6.2 Update the filter form in `routes/items/index.tsx`: add `data-autosubmit`
  to category and room selects; replace Filtern button with search icon button
  for text input only; auto-submit handled in `static/app-init.js`
- [x] 6.3 Run lint and type-check — clean

## 7. Validation

- [x] 7.1 Run the full test suite: `deno task test`
- [x] 7.2 Write Playwright E2E scenario: visit `/items` with >50 items, confirm
  count note and "Alle Gegenstände laden" are shown; click it; confirm all items
  load and browse-limit UI disappears
- [x] 7.3 Write Playwright E2E scenario: change category dropdown; confirm page
  reloads with only category-filtered items without pressing a button
- [x] 7.4 Write Playwright E2E scenario: enter a search term and press Enter;
  confirm results include items from the full corpus, not just the recent 50
- [x] 7.5 Run E2E suite: `deno task e2e` — all scenarios pass
