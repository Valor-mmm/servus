# Design — typed-categories

## Guiding decision: data-shaped, not data-stored (yet)

The expensive jump is **schema-as-code → schema-as-data** (a form-builder UI,
dynamic rendering, runtime-built prompts). We pay the _shape_ of that now and
defer the _storage_:

```
  NOW:    schema = { schemaType, fields: [{ key, label, type, options? }] }
          seeded in lib/inventory/schemas.ts, READ as if it were data
          → UI renders fields from the list
          → AI prompt (later change) is built from the list

  LATER:  an editor writes those same objects to KV
          → user-defined schemas = additive, not a rewrite
          → built-ins remain as seed defaults (the hybrid, for free)
```

Everything below is built so the only thing missing for "user-defined" is the
editor + a KV read in `getSchema`.

## Types

```ts
// lib/inventory/types.ts (additions)

export type FieldType = "text" | "number" | "enum" | "date" | "boolean";

export interface FieldDef {
  key: string; // stable machine key, used in Item.metadata
  label: string; // i18n KEY, not literal German
  type: FieldType;
  options?: string[]; // i18n keys; required iff type === "enum"
}

export interface CategorySchema {
  schemaType: string; // "book" | "tool" | ... | "generic"
  label: string; // i18n key for the type's display name
  fields: FieldDef[]; // generic schema => []
}

// Category gains:
//   schemaType: string   (default "generic")
// Item gains:
//   metadata: Record<string, unknown>   (default {})
//   warrantyUntil?: string              (optional ISO date; a CORE item field,
//                                        not metadata — sits beside estimatedValue,
//                                        available on every item regardless of schema)
```

`label` and `options` hold **i18n keys**, never literal copy — the seed file
stays language-agnostic and `de.ts` remains the single source of German strings
(CLAUDE.md §11). Example: a field's `label` is `"schema.book.author"`, resolved
through `t()` at render time.

## Seed catalogue (launch set)

Tuned to this household (review 2026-06-13). `generic` is the default and
behaves exactly like today's untyped category. Adding more later is one object
in the seed file.

| schemaType          | fields (key · type)                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `generic`           | — (empty; the default)                                                                                                  |
| `book`              | author·text, isbn·text, publisher·text, year·number, series·text, volume·number, ageRange·text                          |
| `tool`              | brand·text, toolType·text, power·enum(manual/corded/cordless)                                                           |
| `clothing`          | type·text, brand·text, size·enum(XS/S/M/L/XL/XXL/XXXL), color·text, season·enum                                         |
| `clothing-numeric`  | type·text, brand·text, sizeNumber·number, color·text, season·enum                                                       |
| `clothing-trousers` | brand·text, waistCm·number, lengthCm·number, color·text, season·enum                                                    |
| `electronics`       | brand·text, model·text, serial·text, purchaseYear·number, deviceType·text                                               |
| `furniture`         | manufacturer·text, material·text, color·text, articleNumber·text, widthCm·number, heightCm·number, depthCm·number       |
| `appliance`         | brand·text, model·text, capacity·text, powerWatts·number, purchaseYear·number, condition·enum(neu/gut/gebraucht/defekt) |
| `toy`               | brand·text, setName·text, setNumber·text, pieceCount·number, complete·boolean, ageRange·text                            |
| `instrument`        | instrumentType·text, brand·text                                                                                         |
| `kitchenware`       | material·text                                                                                                           |
| `textiles`          | type·enum(Bettwäsche/Handtuch/Vorhang/Decke), size·text, material·text, color·text                                      |
| `valuables`         | material·text, gemstone·text, certificateNo·text                                                                        |
| `folder`            | person·text (whose data this Ordner holds; the folder's name uses the item's standard name field)                       |
| `storagebox`        | material·text, widthCm·number, heightCm·number, depthCm·number (a box you own, not a move-Box)                          |

Decisions baked in from the review:

- **tool** — `voltage` dropped (always same brand/tooling); `brand` kept.
- **book** — `ageRange` added for children's books; `series`/`volume` kept for
  now, with the explicit intent to revisit once Groups lands (series there may
  supersede these fields).
- **clothing** — `gender` dropped, and split into **three** schemas by how size
  is expressed (review 2026-06-13) — see "Clothing: three schemas by size
  system" below.
- **appliance** — `warrantyUntil` removed from the schema (now a core item
  field, below); `condition` added.
- **toy** — `pieceCount` kept (a set's piece count is distinct from item
  quantity).
- **instrument** — trimmed to `instrumentType` + `brand` (no year/model).
- **kitchenware** — material only; no brand, no pieceCount (item `quantity`
  covers count), no price (item `estimatedValue` covers value).
- **textiles** — enum includes `Decke` (throw/blanket kept on the couch).
- **valuables** — added for jewelry/valuables (insurance relevance).
- **folder** — new; a single `person` field for whose documents the physical
  binder holds.
- **storagebox** — new; a box the household _owns_ and stores things in,
  distinct from the move-only `Box` entity (see note below).

### Core item field: `warrantyUntil`

`warrantyUntil` is **not** a schema field — it is an optional core `Item` field
(ISO date) alongside `estimatedValue`, editable on every item regardless of
category. Reason: warranty applies to anything (a couch, a drill, a toy), so
forcing it into one schema would miss the rest.

### Clothing: three schemas by size system

Clothing splits into three `schemaType`s that differ only in how size is
expressed — chosen so data entry shows exactly the right size control, not all
of them:

- `clothing` — letter sizes: `size` enum XS…XXXL (shirts, jumpers, kids' wear).
- `clothing-numeric` — single Konfektionsgröße: `sizeNumber` (e.g. 46) (suits,
  dresses, blouses).
- `clothing-trousers` — `waistCm` + `lengthCm` (Bundweite/Schrittlänge).

Base fields (`type`, `brand`, `color`, `season`) are shared; only the size
field(s) differ. The user creates categories ("T-Shirts", "Anzüge", "Hosen")
pointing at whichever fits. A dropdown-on-one-schema was rejected: it would show
all three size inputs at once and force the user to ignore two.

### Deferred — not seeded

- From the original twelve: `video`, `game`, `plant`, `art` — same shape, add
  when needed.
- Also considered, not seeded: `music` (CD/Vinyl), `sports`, `documents`.

### Note: `storagebox` (a possession) vs the move-`Box` (infrastructure)

The app already has a **Box** domain entity (`Box`, `BoxStatus`, scannable
codes, room assignment — `lib/inventory/types.ts`). Per the review, that entity
is **move-only** — likely deactivated or removed once the move is done. A
**storage box you own** (a crate that lives on a shelf and holds things
long-term) is a different thing: it is an _item_, with a category.

This change adds the `storagebox` **category** (an item type) so such boxes can
be inventoried like any other possession. What it does **not** add yet is
_assigning items into a storage box_ — the storage-box ⇄ contained-items
relationship is deliberately out of scope (it is the future linking work, and
must not be conflated with the move-`Box` `Item.boxId` field, which means
something else). For now a storage box is just an item you can name, photograph,
and describe.

## Accessors (the seam for "data" later)

```ts
// lib/inventory/schemas.ts
export function getSchema(schemaType: string): CategorySchema; // generic fallback
export function listSchemaTypes(): { schemaType: string; label: string }[];
```

The app calls only these — never the raw seed map. When schemas become
user-defined, `getSchema` gains a KV read ahead of the seed fallback; no caller
changes.

## Validation (boundary, not invariant)

`metadata` is validated where it enters the system (the item write path), per
CLAUDE.md §13 "validate at the network boundary, trust internal invariants":

- Look up the item's category → its `schemaType` → its `FieldDef[]`.
- Keep only keys present in the schema; **drop unknown keys** silently (the
  schema is the contract, not the client payload).
- Coerce/validate each value to its `FieldType`:
  - `number` → finite number or reject; `date` → ISO `YYYY-MM-DD` or reject;
    `boolean` → true/false; `enum` → must be one of `options`; `text` → trimmed
    string, empty becomes absent.
- A missing field is simply absent in `metadata` (no nulls stored).

No defensive re-validation on read — KV is trusted once written.

## Storage

`metadata` lives **inline on the item record**, not in a separate KV key:

- It is small, always read with the item, and never queried independently.
- No new index. The existing item key and prefix indexes are unchanged; the
  encoder just carries two more fields. This keeps `lib/kv/` a thin typed
  wrapper (CLAUDE.md §9 — no query builder).

`Category.schemaType` is likewise just another field on the category record.

## Backward compatibility — existing production data

The app is **live with real data**: the wife has already added items and created
"Tassen" and "Gläser" categories. This change must not disturb them.

It doesn't, because it is additive with tolerant decoding:

- Category/item decoders treat the new fields as optional and supply defaults
  (`schemaType` → `"generic"`, `metadata` → `{}`, `warrantyUntil` → null) when a
  record predates this change. Defaults are persisted the next time the record
  is written — a lazy, no-op migration.
- No backfill script runs against production KV. Stamping `generic` onto records
  that already behave as generic adds risk for no behavioural change.
- The genuine "migration" — retyping "Tassen"/"Gläser" to the `kitchenware`
  schema (mugs/glasses are ceramic/glass; `material` is the apt field) — is a
  manual edit in the new category form. Two categories, a human decision; not
  worth (or safe to) script.

This is verified by an explicit "legacy record" decode test (tasks §3).

## UI

- **Category form** — a schema-type `<select>` populated from
  `listSchemaTypes()`. Defaults to `generic`. Changing a category's schema does
  not rewrite existing items' metadata (orphan keys are simply never rendered).
- **Item detail/edit** — after the existing name/category/room/box/quantity
  fields, render the category schema's fields in order. One control per
  `FieldType` (text input, number input, native date, select, checkbox). Server
  handler runs the same validation as the API boundary.
- **Item list** — explicitly unchanged: thumbnail + name + category only. A
  reaffirmed requirement guards against typed fields leaking into the list.

## Alternatives considered

- **Full user-defined schemas now** — rejected: a form-builder UI is more than
  the move needs, and the real driver (Maria editing schemas) has no deadline.
  The data-shaped model gets us there later cheaply.
- **Separate KV key per item's metadata** — rejected: extra read, extra index,
  no query benefit. Inline is simpler and matches the access pattern.
- **Multi-category items to satisfy "one isn't enough"** — rejected: breaks "one
  category = one field schema" and muddies AI extraction. That need is served by
  Groups (a later change), not here.
- **A schema/validation library (e.g. zod)** — rejected per dependency policy
  (§9). The field types are a closed set of five; a hand-written validator is
  small, vendorable, and has no churn.
