## 1. KV Export Library (TDD)

- [x] 1.1 Write failing unit tests for `lib/kv/export.ts` in
      `tests/unit/kv/export_test.ts`: verify NDJSON line format
      (`{key, value, versionstamp}`), verify all `EXPORT_PREFIXES` entries
      appear in output, verify `session`/`session-by-user`/`rate` entries are
      excluded, verify `["box-code-counter"]` single key is included, verify
      empty store produces zero lines
- [x] 1.2 Implement `lib/kv/export.ts`: define `EXPORT_PREFIXES` and
      `EXCLUDE_PREFIXES` constant arrays, implement
      `exportKv(kv: Deno.Kv): AsyncGenerator<string>` that iterates all in-scope
      prefixes via `kv.list` and the `box-code-counter` key via `kv.get`,
      yielding one NDJSON line per entry — unit tests must pass

## 2. KV Import Library (TDD)

- [x] 2.1 Write failing unit tests for `lib/kv/import.ts` in
      `tests/unit/kv/import_test.ts`: verify all in-scope entries are written,
      verify `session`/`session-by-user`/`rate` lines in the input are silently
      skipped and counted, verify second import run overwrites without error
      (idempotency), verify batch-write behaviour with >50 entries, verify
      returned summary counts (`imported`, `skipped`)
- [x] 2.2 Implement `lib/kv/import.ts`: implement
      `importKv(kv: Deno.Kv, lines: AsyncIterable<string>): Promise<{imported: number, skipped: number}>`
      with 50-entry `kv.atomic()` batches — unit tests must pass

## 3. KV Delete-All Library (TDD)

- [x] 3.1 Write failing unit tests for `lib/kv/deleteAll.ts` in
      `tests/unit/kv/deleteAll_test.ts`: verify all in-scope entries are
      deleted, verify `session`/`session-by-user`/`rate` entries are preserved,
      verify returned `deleted` count is accurate, verify empty store returns
      count 0
- [x] 3.2 Implement `lib/kv/deleteAll.ts`: implement
      `deleteAllKv(kv: Deno.Kv): Promise<{deleted: number}>` reusing
      `EXPORT_PREFIXES` from `lib/kv/export.ts`, deleting in 50-entry
      `kv.atomic()` batches — unit tests must pass

## 4. Admin Routes and UI — Export and Import

- [x] 4.1 Create `routes/admin/index.tsx`: server-rendered admin page with
      export download link (`/admin/export`), file upload form
      (`POST /admin/import`), and destructive entry point linking to
      `/admin/delete-confirm`; display result banners for
      `?imported=N&skipped=M`, `?deleted=N`, and `?error=...`; use `t()` for all
      copy
- [x] 4.2 Add German copy for the admin page to `lib/i18n/locales/de.ts`: page
      title, export button label, import form label, success/error banner
      messages
- [x] 4.3 Create `routes/admin/export.ts`: `GET` handler that calls `getKv()`,
      pipes `exportKv()` into a streaming `Response` with
      `Content-Type: application/x-ndjson` and
      `Content-Disposition: attachment; filename="servus-export-<YYYY-MM-DD>.ndjson"`
- [x] 4.4 Create `routes/admin/import.ts`: `POST` handler that reads the
      uploaded multipart file, calls `importKv()`, and redirects to
      `/admin?imported=N&skipped=M`; on parse error redirects to
      `/admin?error=...`

## 5. Admin Routes and UI — Delete Confirmation

- [x] 5.1 Create `routes/admin/delete-confirm.tsx`: `GET` handler counts
      in-scope records via `exportKv()` iteration, renders a standalone
      confirmation page with the record count, a destructive-styled submit
      button (red/danger), prominent warning text, and a cancel link to `/admin`
- [x] 5.2 Create `routes/admin/delete.ts`: `POST` handler calls `deleteAllKv()`
      and redirects to `/admin?deleted=N`
- [x] 5.3 Add German copy for the delete confirmation flow to
      `lib/i18n/locales/de.ts`: confirmation page title, warning message, record
      count label, delete confirmation button label, post-delete success message

## 6. Integration Tests

- [x] 6.1 Write integration test in
      `tests/integration/kv/export_import_test.ts`: populate an in-memory KV
      with items, boxes, rooms, categories, a user, an invite, a session, and a
      rate entry; run `exportKv()` and collect NDJSON lines; run `importKv()`
      into a fresh in-memory KV; assert all in-scope entries match, assert
      session and rate entries are absent from export output and restored KV
- [x] 6.2 Write integration test: run `importKv()` twice with the same lines
      into the same KV instance; assert no error and record counts are identical
      after both runs (idempotency)
- [x] 6.3 Write integration test for `deleteAllKv()`: populate an in-memory KV
      with in-scope entries plus a session and a rate entry; run
      `deleteAllKv()`; assert all in-scope entries are gone, assert session and
      rate entries are untouched, assert returned count matches the number of
      deleted entries

## 7. Validation and E2E

- [x] 7.1 Run `openspec validate --change add-import-export` and resolve any
      spec warnings
- [x] 7.2 Playwright E2E in `tests/e2e/export_import.spec.ts`: log in as owner,
      create one item and one box via the UI, navigate to `/admin`, trigger the
      export and assert the response contains NDJSON lines for the created item
      and box; navigate to `/admin/delete-confirm`, assert the record count is
      shown and the delete button has destructive styling, activate cancel and
      assert no data was deleted; perform a full round-trip: export → delete-all
      → import the downloaded snapshot → assert the success banner shows the
      correct imported count and the item and box are visible in the app
