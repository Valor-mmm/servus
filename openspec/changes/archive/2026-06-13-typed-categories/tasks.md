## 1. Domain types and schema catalogue

- [x] 1.1 Add a failing unit test for `getSchema` / `listSchemaTypes`: generic
      schema has empty fields; a typed schema (book) returns its fields in order
      with correct keys and types; an unknown `schemaType` falls back to generic
- [x] 1.2 Add `FieldType`, `FieldDef`, `CategorySchema` to
      `lib/inventory/types.ts`; extend `Category` with `schemaType: string` and
      `Item` with `metadata: Record<string, unknown>` and optional core
      `warrantyUntil: string | null`
- [x] 1.3 Create `lib/inventory/schemas.ts` with the seeded catalogue (generic,
      book, tool, clothing, clothing-numeric, clothing-trousers, electronics,
      furniture, appliance, toy, instrument, kitchenware, textiles, valuables,
      folder, storagebox — fields per `design.md`) using i18n keys for labels
      and options, and implement `getSchema` / `listSchemaTypes`

## 2. Metadata validation at the write boundary

- [x] 2.1 Add a failing unit test for a `validateMetadata(schema, input)`
      helper: conforming values pass; unknown keys dropped; wrong-typed value
      rejected; out-of-list enum rejected; empty/absent fields omitted (no
      nulls)
- [x] 2.2 Implement `validateMetadata` in `lib/inventory/` covering all five
      field types with boundary coercion (finite number, ISO date, boolean,
      enum-membership, trimmed text)

## 3. KV persistence of new fields

- [x] 3.1 Add a failing integration test: create a category with `schemaType`
      and an item with `metadata`; read both back from KV and assert the fields
      round-trip; an unknown `schemaType` on a category is rejected
- [x] 3.1a Add a failing integration test for **legacy records** (the live data
      case): a category and item persisted in the pre-change shape (no
      `schemaType` / `metadata` / `warrantyUntil`) decode to generic / `{}` /
      null, remain editable, and persist the defaults on next write — no
      migration script involved
- [x] 3.2 Extend the category and item encoders/decoders (normalize-on-read in
      `lib/inventory/`) to carry `schemaType`, `metadata`, and `warrantyUntil`
      (default generic / empty `{}` / null on read of pre-existing records); no
      new index
- [x] 3.3 Wire `validateMetadata`, `schemaType` validation, and `warrantyUntil`
      ISO-date validation into the category and item create/edit write paths in
      `lib/inventory/`

## 4. i18n strings

- [x] 4.1 Add German strings to `lib/i18n/locales/de.ts` for schema type display
      names, every seeded field label, enum option labels, and the category
      schema-type select label — no inline copy anywhere in components
      (dynamic-key helper `td()` added for runtime schema keys)

## 5. Category form — schema type selection

- [x] 5.1 Add a failing unit/integration test: the category create/edit form
      submits a `schemaType`, it is persisted, and an unknown value is rejected
      (repo-level coverage in `typedCategories_test.ts`: create/update with
      schemaType + unknown rejection)
- [x] 5.2 Add a schema-type `<select>` (populated from `listSchemaTypes()`,
      default generic) to the category create/edit form and handler (plus an
      inline per-row edit form so existing categories can be retyped)

## 6. Item detail/edit — schema-driven fields

- [x] 6.1 Add a failing test asserting the item edit page renders a typed
      category's fields in order with the correct control per type, pre-filled
      from metadata, and renders none for a generic category
      (`schemaFields_test.tsx`)
- [x] 6.2 Render the schema fields on the item detail/edit page (one control per
      `FieldType`), wire submission through `validateMetadata`, and persist to
      `Item.metadata`
- [x] 6.3 Add the optional `warrantyUntil` date control beside estimated value
      on the item edit page (shown for every item), validated as an ISO date

## 7. Item list stays minimal

- [x] 7.1 Add a failing test asserting the item list renders only
      thumbnail/name/category and contains no schema metadata values for items
      in typed categories (`itemList_minimal_test.tsx`)

## 8. Spec sync and E2E

- [x] 8.1 Spec delta in `specs/inventory/spec.md` complete (MODIFIED Category
      management + ADDED catalogue / metadata / detail-editing / warranty /
      list-minimal). `openspec validate typed-categories --strict` → **valid**.
      The canonical `openspec/specs/inventory/spec.md` merge happens at archive
      (CLAUDE.md §6). Note: `openspec` v1.3.1 is installed via nvm
      (`~/.nvm/versions/node/v20.12.2/bin`), not on the default PATH.
- [x] 8.2 Add a Playwright E2E scenario: create a typed (book) category, assign
      it to an item, edit the schema fields on the item, save, reload and
      confirm persistence, and confirm the item list still shows only
      thumbnail/name/category — `tests/e2e/typed-categories.spec.ts`, passing
