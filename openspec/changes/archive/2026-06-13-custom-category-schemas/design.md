# Design — custom-category-schemas

## The seam we're completing

`typed-categories` left this exact extension point (its design.md):

> LATER: an editor writes those same objects to KV → "user-defined" becomes
> additive, not a rewrite → built-ins remain as seed defaults.

So the data model (`CategorySchema` / `FieldDef`) and the validation
(`validateMetadata`) are already in place. This change adds storage, resolution,
and an editor. No item or category data changes.

## Resolution: overlay first, seed fallback

```
resolveSchema(schemaType)
      │
      ├─ KV overlay  ["category-schema", schemaType]  ─── hit ─▶ return it
      │                                                (user-defined OR a
      │                                                 built-in override)
      └─ miss ─▶ seeded BY_TYPE.get(schemaType)  ─── hit ─▶ return built-in
                        └─ miss ─▶ generic
```

`getSchema` today is synchronous (in-memory Map). We keep it as the **seed
fallback** and add:

```ts
// lib/inventory/schemas.ts  (built-in seed fallback, unchanged)
export function getSeedSchema(schemaType: string): CategorySchema | undefined;

// lib/inventory/schemaRepo.ts  (new, KV overlay)
export async function resolveSchema(
  schemaType: string,
): Promise<CategorySchema>;
export async function listSchemaTypes(): Promise<
  { schemaType: string; label: string; source: "builtin" | "user" }[]
>;
export async function createSchema(input: SchemaInput): Promise<CategorySchema>;
export async function updateSchema(
  schemaType: string,
  input: SchemaInput,
): Promise<CategorySchema>;
export async function deleteSchema(schemaType: string): Promise<void>;
```

`listSchemaTypes` merges seeded built-ins with overlay entries (overlay wins on
id collision, marked `source: "user"`). Callers that need a resolved schema
(`itemRepo` write paths, the item detail/edit handlers, the category form) call
the async resolver and pass the result down as a prop — the same pattern
`edit.tsx` already uses. **`routes/items/[id].tsx` moves its `getSchema` call
out of the component body into the GET handler.**

## Storage

```
["category-schema", schemaType] → {
  schemaType,            // immutable id
  label,                 // literal display text (user content)
  fields: FieldDef[],    // labels/options are literal text for user schemas
  origin: "user" | "builtin-override",
  createdAt, updatedAt,
}
```

No new index. `listSchemaTypes` scans the small `["category-schema"]` prefix.
The "in use?" check for deletion reuses the existing `item-by-category` →
category → schemaType relationship: a schema is in use if any category has that
`schemaType`. (Categories are few; a `listCategories` scan is fine.)

## Labels are data, not copy

This is the one real divergence from CLAUDE.md §11, and it's intentional and
already supported:

- **Built-in** schemas keep i18n keys (`field.author`, `option.power.cordless`).
- **User-defined** schemas store the literal German the user typed
  ("Lieblingsfarbe").
- Rendering uses `td(label)`, which returns `de[label]` when present and
  otherwise the raw string. A built-in key resolves; a literal label passes
  through unchanged. **No code branch needed.**

Editor _chrome_ (field-type names, buttons, errors) is static UI → stays in
`de.ts` via `t()`.

## Copy-on-write for built-in overrides

Editing a built-in (e.g. add a field to `book`) must not require shipping all of
`book` as user data up front. On first edit of a built-in:

1. Resolve the seed schema, **materialise** it into an editable form — field
   labels resolved through `td()` to literal text so the user sees/edits real
   German, not `field.author`.
2. Persist the result under `["category-schema", "book"]` with
   `origin: "builtin-override"`.
3. Resolution now returns the override; deleting it reverts to the seed.

The id stays `book`, so every existing category and item keeps working.

## Validation (boundary)

`lib/inventory/validateSchema.ts`:

- `schemaType` id: non-empty, slug format (`[a-z0-9-]+`), unique across
  overlay + seed (for create). For built-in override, id must equal the built-in
  id.
- each field `key`: non-empty, slug format, unique within the schema.
- `type` ∈ the five allowed values.
- `enum` field: `options` non-empty (each option label is literal text).

Item metadata validation is unchanged — it already takes a resolved
`CategorySchema`.

## UI

- New routes under `routes/categories/schemas/`:
  - list user-defined schemas + "neuen Typ erstellen"
  - create / edit form: name input + a repeatable field-row editor (label, type
    select, options textarea shown only for `enum`). Server-rendered; a small
    island or progressive `<template>`-free add-row may be deferred — MVP can
    submit a fixed set of rows and re-render to add more, keeping it
    island-free.
- The existing `/categories` type dropdown now lists built-ins + user schemas
  via the async `listSchemaTypes`.

## Decision: override built-ins, don't fork them

Considered **add-only** (users can only create brand-new schemas; built-ins are
read-only). Rejected because the user explicitly wants to _edit existing_ types
(add a field to Buch). Copy-on-write override gives that without endangering the
seed (delete reverts). Built-ins are never destructively changed; the generic
schema is never editable.

## Alternatives considered

- **Make `getSchema` itself async + KV-backed everywhere** — rejected: needless
  KV reads for built-ins and a wider blast radius. Keep sync seed fallback,
  resolve once per request.
- **Store user labels as generated i18n keys in `de.ts`** — rejected: `de.ts` is
  developer-owned source; writing user content into it at runtime is wrong.
  Literal labels + `td()` fallback is simpler and already works.
- **A field-builder island with live add/remove** — nice-to-have; not required
  for MVP. Keep the editor server-rendered first; add interactivity later if the
  flow feels clunky.
