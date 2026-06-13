## Why

Today a `Category` is just `{ id, name }` and an `Item` carries only a free
`name`. That is enough to pack boxes, but it throws away the structure we will
want the moment the move is over: a book has an author and ISBN, a tool has a
brand and voltage, an appliance has a model and warranty date. Capturing that
structure by hand is tedious, and the planned AI enrichment pipeline has nowhere
to put what it extracts — it would have to invent a shape on the fly every time.

This change gives categories a **schema**: a typed list of extra fields. An item
whose category has a schema gains a `metadata` bag holding those field values.
The AI pipeline (a later change) then has a fixed target to fill in, and the
user gets a clean detail page instead of cramming everything into the name.

The design decision driving this change: **schemas are hardcoded now, but
data-shaped.** Each schema is a plain object (`{ schemaType, fields: [...] }`)
seeded in code and read as if it were data — the UI renders fields from the
list, and the AI prompt is built from the list. Crossing from "schema as code"
to "schema as data" later (a user-facing editor, so Maria can add fields without
a deploy) becomes an additive change, not a rewrite. We do not build that editor
here.

See `docs/exploration-typed-categories-and-groups.md` for the full reasoning.

## What Changes

User-visible:

- A category can now have a **type** (`schemaType`) chosen from a fixed,
  built-in list. The launch catalogue is _Allgemein_ (generic, no extra fields,
  the default), _Buch_, _Werkzeug_, _Kleidung_ (in three size variants:
  Buchstabengröße, Konfektionsgröße, and Hose), _Elektronik_, _Möbel_,
  _Haushaltsgerät_, _Spielzeug_, _Instrument_, _Küche_, _Heimtextilien_,
  _Wertsachen_, _Ordner_, and _Aufbewahrungsbox_. The default is the generic
  type — existing categories keep behaving exactly as before. (Exact field lists
  per type live in `design.md`.)
- Every item also gains an optional **warranty-until date** (`warrantyUntil`), a
  core item field beside the existing estimated value — available on any item
  regardless of its category, fill it in when relevant.
- When an item's category has a typed schema, the item **detail/edit page**
  shows the schema's extra fields (e.g. author, ISBN for a book), rendered from
  the schema definition and editable by hand. Values are persisted per item.
- The **item list view stays minimal** — still just photo thumbnail, name, and
  category. Typed fields appear only on the detail/edit page, so the list stays
  fast and readable on mobile.
- Fields support a small set of input types: free text, number, single-select
  (enum), date, and yes/no (boolean). The form renders the right control per
  type and validates input at the boundary.

Internal:

- `Category` gains `schemaType: string`. `Item` gains
  `metadata: Record<string, unknown>` and an optional core `warrantyUntil` (ISO
  date) field.
- Schema definitions live in `lib/inventory/schemas.ts` as seeded data objects,
  exported through a typed accessor so the rest of the app never imports the raw
  map directly.
- Metadata is stored inline on the item record (no separate KV key). Unknown or
  schema-mismatched keys are dropped on write — the schema is the contract.

## Non-goals

- **Groups, series, and tags.** Separate later changes
  (`exploration-typed-categories-and-groups.md`, sections B and C). Nothing here
  links items together.
- **AI classification / extraction.** This change only builds the schema data
  model and the manual editing UI. The AI pipeline that auto-fills `metadata` is
  the parked `item-classification` change.
- **User-facing schema editor.** Schemas are edited in code for now. The model
  is shaped so an editor is additive later, but the editor itself is out of
  scope.
- **The full ~12-schema catalogue.** We seed a lean launch set; adding more
  schemas later is a one-object edit to the seed file, not a schema change.
- **Multi-category items.** An item still has exactly one category. The "one
  category isn't enough" need is deliberately deferred to Groups, not solved by
  multi-category here.
- **Assigning items into a storage box.** This change adds a `storagebox`
  category so boxes you own can be inventoried as items, but it does **not** add
  the storage-box ⇄ contained-items relationship. That linking (and its
  distinction from the move-only `Box` entity / `Item.boxId`) is future work.
  See `design.md`.
- **A migration / backfill script.** Production already holds real items and
  categories (the wife added items plus "Tassen" and "Gläser" categories). This
  change is additive and backward-compatible: the KV decoders default missing
  fields on read (`schemaType` → generic, `metadata` → `{}`, `warrantyUntil` →
  null) and persist them on next write. No data rewrite is run. Retyping the
  existing "Tassen"/"Gläser" categories to the `kitchenware` schema is an
  optional, manual act in the new category-edit UI — a judgment call, not a
  scripted guess.

## Capabilities

### New Capabilities

None — this extends the existing `inventory` capability rather than adding a new
one.

### Modified Capabilities

- `inventory`: Category management gains a schema type. New requirements cover
  the built-in schema catalogue, the per-item typed `metadata` field and its
  validation, and the schema-driven detail/edit rendering. The item list
  requirement is reaffirmed as minimal (no typed fields in the list).

## Impact

Code:

- `lib/inventory/types.ts` — `Category.schemaType: string`,
  `Item.metadata: Record<string, unknown>`, optional core `Item.warrantyUntil`,
  plus `FieldType`, `FieldDef`, and `CategorySchema` types.
- `lib/inventory/schemas.ts` (new) — the seeded schema catalogue + typed
  accessors (`getSchema(schemaType)`, `listSchemaTypes()`).
- `lib/inventory/` category and item write paths — accept and validate
  `schemaType` / `metadata`; strip keys not in the schema.
- `lib/kv/` — item and category encoders carry the new fields (additive; no
  index change).
- `routes/` + `components/` — category create/edit form gains a schema-type
  select; item detail/edit page renders schema fields; item list unchanged.
- `lib/i18n/locales/de.ts` — schema type names, field labels, and field-type
  control copy. All user-visible strings go through `t()`; no inline German.
- `tests/unit/` — schema accessor and metadata-validation tests.
- `tests/integration/` — category-with-schema and item-with-metadata round-trips
  against KV.
- `tests/e2e/` — Playwright scenario: assign a typed category, edit its fields
  on an item, confirm persistence and that the list stays minimal.

Dependencies:

- None added. Field definitions and validation are plain TypeScript; no
  form-builder or schema library is introduced.

Risk:

- Storing `metadata` inline keeps reads simple but means a schema change can
  orphan old keys. Mitigated by validating against the schema on every write
  (unknown keys dropped) and by the small, known user base — schemas can change
  freely.
- The seeded field set per schema is a guess; getting it wrong is cheap to fix
  (edit the seed object), and no migration is required because metadata is a
  free bag.
