## Why

The `typed-categories` change shipped a deliberately data-_shaped_ but
code-_seeded_ schema catalogue: schemas are plain `CategorySchema` objects read
through `getSchema` / `listSchemaTypes`, so the rest of the app never depends on
where they come from. The plan was always that adding new schemas — or editing
their fields — would become a UI feature without rewriting callers. That is this
change.

The driver is concrete: the wife does most item entry and cannot edit a code
file. Today, adding a category type or a field means a developer edit and a
deploy. This change lets users define and edit category schemas directly in the
UI.

## What Changes

User-visible:

- A **schema management UI** where a user can **create a new category type**:
  give it a name and an ordered list of fields, each with a label, a type (text,
  number, single-select, date, yes/no), and — for single-select — a list of
  options.
- The user can **edit an existing user-defined schema** (its name, its fields)
  and **extend a built-in schema** (e.g. add a field to _Buch_). Editing a
  built-in materialises an editable copy into storage that then takes precedence
  (copy-on-write); the original seed remains the fallback.
- New and edited schemas immediately appear in the category type dropdown
  (`/categories`) and drive the item detail/edit fields, exactly like built-ins.
- A user-defined schema can be **deleted only when no category uses it**
  (mirrors category deletion).

Internal:

- A KV-backed **schema overlay**: schema definitions stored under a
  `category-schema` key space. Resolution reads the overlay first, then falls
  back to the seeded built-in catalogue (`getSchema` gains an async resolver;
  built-ins stay as the in-memory fallback).
- **Labels become data.** Seeded schemas use i18n keys; user-defined schemas
  store literal German text as labels. The existing `td()` helper already
  returns the raw string when a key is absent from `de.ts`, so literal labels
  render correctly with no special-casing.
- Boundary validation for schema definitions: `schemaType` id uniqueness and
  format, field-key uniqueness and format, single-select fields require at least
  one option.

## Non-goals

- **Changing the five field types.** The type set (text / number / enum / date /
  boolean) is fixed; no nested or computed fields.
- **Per-item data.** This is about schema _definitions_, not item values. Item
  metadata continues to validate against whatever its category's schema resolves
  to (orphan keys from a removed field are simply not rendered — consistent with
  `typed-categories`).
- **Renaming or deleting a schemaType that categories use.** A schemaType id is
  immutable once created; deletion is blocked while in use.
- **Deleting or breaking built-in schemas.** Built-ins cannot be deleted; they
  can only be extended via copy-on-write override.
- **Groups, tags, AI classification.** Separate later changes.
- **A migration script.** The app is live with real data; this change is
  additive — categories and items are untouched, and a category whose schema is
  later edited keeps working.

## Capabilities

### Modified Capabilities

- `inventory`: the category schema catalogue gains a user-editable storage
  overlay layered over the seeded built-ins, plus new requirements for creating,
  editing, validating, and deleting user-defined schemas.

## Impact

Code:

- `lib/inventory/schemas.ts` — split into the seeded catalogue (unchanged
  fallback) plus async resolution that consults the KV overlay first.
- `lib/inventory/schemaRepo.ts` (new) — typed KV wrapper: create / update /
  delete / list user schema definitions; copy-on-write for built-in overrides.
- `lib/inventory/validateSchema.ts` (new) — boundary validation of a submitted
  schema definition.
- `lib/inventory/itemRepo.ts`, `routes/items/[id].tsx`,
  `routes/items/[id]/
  edit.tsx`, `routes/categories/index.tsx` — resolve
  schemas via the async resolver (the detail page moves its `getSchema` call
  into the handler).
- `routes/categories/schemas/` (new) — the schema editor pages/handlers.
- `lib/i18n/locales/de.ts` — static UI copy for the editor (field-type names,
  buttons, validation messages). User-entered labels are data, not `de.ts`.
- `tests/unit`, `tests/integration`, `tests/e2e` — schema repo, validation,
  resolution precedence, and an end-to-end editor flow.

Dependencies: none added.

Risk: making schema resolution async touches several call sites; mitigated by
keeping the seeded sync accessor as the fallback and resolving once per request
in handlers. Editing a built-in via copy-on-write could drift from future seed
updates — acceptable and documented (the override wins by design).
