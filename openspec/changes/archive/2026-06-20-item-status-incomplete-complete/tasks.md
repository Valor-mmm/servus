## 1. Data model

- [x] 1.1 Update `ItemStatus` in `lib/inventory/types.ts` from
      `"pending" | "suggested" | "confirmed"` to `"incomplete" | "complete"`
- [x] 1.2 Update all `createItem` call sites to use `"complete"` for standard
      form and `"incomplete"` for photo-first path
- [x] 1.3 Update `UpdateItemInput` to include an explicit `status: ItemStatus`
      field (no longer derived/preserved)
- [x] 1.4 Update `updateItem` in `lib/inventory/itemRepo.ts` to write the
      supplied `status` field

## 2. Migration

- [x] 2.1 Write failing unit test for migration script: items with `"pending"` →
      `"incomplete"`, `"confirmed"` and `"suggested"` → `"complete"`,
      already-migrated items skipped
- [x] 2.2 Write `scripts/migrate-item-status.ts`: iterate `["item", *]` and
      `["item-by-time", *]` records, remap status values, idempotent

## 3. Item edit form

- [x] 3.1 Add i18n keys: `items.saveComplete` ("Speichern & fertig"),
      `items.saveIncomplete` ("Speichern & unvollständig")
- [x] 3.2 Replace the single "Speichern" submit button in the item edit
      route/component with two submit buttons that submit `status=complete` and
      `status=incomplete` respectively via a hidden `<input name="status">`
- [x] 3.3 Update the item edit POST handler to read `status` from the form body
      and pass it to `updateItem`
- [x] 3.4 Write unit test: edit form handler with `status=complete` persists
      `"complete"`, with `status=incomplete` persists `"incomplete"`

## 4. Triage route

- [x] 4.1 Add i18n keys for triage: `items.triageIndex` ("{{n}} von {{m}}"),
      `items.triageEmpty` (empty-state copy), `items.triagePrev` ("Vorheriges"),
      `items.triageNext` ("Nächstes")
- [x] 4.2 Create `routes/items/incomplete.tsx`: fetch all incomplete items
      sorted by `createdAt` asc, resolve the current item by `?idx=` param
      (default 0), render the full edit form inline with two save buttons and
      prev/next nav
- [x] 4.3 Create `routes/items/pending.ts`: handler-only, returns `Response`
      with `status: 301, Location: "/items/incomplete"`
- [x] 4.4 Update the POST handler on the triage page to save the item and
      redirect to `/items/incomplete?idx=<next>` (or `/items/incomplete` when
      all complete)

## 5. References update

- [x] 5.1 Update all remaining references to `"pending"` / `"confirmed"` /
      `"suggested"` in routes, islands, components, and i18n (`de.ts`)
- [x] 5.2 Update nav links that point to `/items/pending` → `/items/incomplete`
- [x] 5.3 Update the placeholder-name logic in item list display: show
      `(unbenannt)` when `name` is empty (regardless of status — status no
      longer controls this)

## 6. Tests

- [x] 6.1 Update all unit and integration tests that reference old status values
- [x] 6.2 E2E test (`tests/e2e/triage.spec.ts`): photo-first flow → item appears
      in `/items/incomplete` → fill in name → save as complete → auto-advances →
      empty state when done
- [x] 6.3 E2E test: GET `/items/pending` redirects to `/items/incomplete`
- [x] 6.4 Run `deno task test` — all tests pass
- [x] 6.5 Run `deno task e2e` — all E2E tests pass
