## 1. Schema definition validation

- [x] 1.1 Add a failing unit test for `validateSchemaDefinition(input)`: accepts
      a valid definition; rejects empty/non-slug `schemaType`; rejects duplicate
      field keys; rejects non-slug field keys; rejects an enum field with no
      options; accepts all five field types
- [x] 1.2 Implement `lib/inventory/validateSchema.ts` covering the above
      (boundary validation; returns a normalized `CategorySchema` or throws)

## 2. KV schema overlay + resolution

- [x] 2.1 Add a failing integration test: `createSchema` persists a user schema;
      `resolveSchema` returns it; `resolveSchema` returns the seeded built-in
      when no overlay exists; an overlay under a built-in id takes precedence;
      unknown id resolves to generic
- [x] 2.2 Refactor `lib/inventory/schemas.ts` to expose the seed fallback
      (`getSeedSchema`) while keeping the in-memory built-in catalogue
- [x] 2.3 Implement `lib/inventory/schemaRepo.ts`: `resolveSchema`,
      `listSchemaTypes` (merged built-in + overlay, overlay wins, tagged
      `source`), `createSchema`, `updateSchema`, `deleteSchema`, using
      `["category-schema", schemaType]`; no new index
- [x] 2.4 Add a failing test for copy-on-write: editing a built-in materialises
      an overlay copy with labels resolved to literal text and
      `origin: "builtin-override"`; deleting that override reverts resolution to
      the seed

## 3. Deletion + in-use guard

- [x] 3.1 Add a failing integration test: deleting a user schema no category
      uses succeeds; deleting one a category references is rejected;
      built-in/generic schemas cannot be deleted
- [x] 3.2 Implement the in-use guard in `deleteSchema` (a schema is in use if
      any category has that `schemaType`) and forbid deleting generic/built-in
      seeds

## 4. Wire async resolution into existing callers

- [x] 4.1 Update `itemRepo` metadata validation and the item detail/edit +
      category-form handlers to use `resolveSchema` / async `listSchemaTypes`;
      move `routes/items/[id].tsx`'s schema lookup into the GET handler and pass
      the resolved schema as a prop
- [x] 4.2 Confirm existing typed-categories tests still pass (built-ins resolve
      identically through the overlay path); fix any sync→async call sites

## 5. i18n (editor chrome only)

- [x] 5.1 Add German static UI strings to `lib/i18n/locales/de.ts` for the
      schema editor (page titles, field-type names, add/remove-field, options
      label, save/delete, validation messages). User-entered schema labels are
      data, not `de.ts`.

## 6. Schema editor UI

- [x] 6.1 Add a failing render test: the schema editor form renders a name input
      and field rows (label + type select + options for enum), and a typed
      category created from a user schema renders its fields on the item edit
      page
- [x] 6.2 Implement `routes/categories/schemas/` (list + create + edit + delete
      handlers and server-rendered forms); link it from `/categories`
- [x] 6.3 Ensure the `/categories` type dropdown lists built-ins + user-defined
      schemas via async `listSchemaTypes`

## 7. Spec sync and E2E

- [x] 7.1 Spec delta complete;
      `openspec validate custom-category-schemas
      --strict` → **valid**.
      Canonical `openspec/specs/inventory/spec.md` merge happens at archive
      (CLAUDE.md §6).
- [x] 7.2 Add a Playwright E2E: create a custom category type with a couple of
      fields, create a category using it, add an item in that category, fill the
      custom fields on the item, save, reload and confirm persistence; confirm
      the type appears in the `/categories` dropdown —
      `tests/e2e/custom-category-schemas.spec.ts`, passing
