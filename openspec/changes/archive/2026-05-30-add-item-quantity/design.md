## Context

`Item` currently has no quantity field. The item list and box detail views
display one row per item record, implying each record = one physical unit.
Adding a `quantity` field (integer, ≥1) lets a single record represent multiple
identical objects and surfaces that count everywhere an item is displayed.

The `Item` type lives in `lib/inventory/types.ts`; persistence is in
`lib/inventory/itemRepo.ts` using Deno KV with atomic operations. The item
create/edit forms are server-rendered routes under `routes/items/`.

## Goals / Non-Goals

**Goals:**

- `Item.quantity` is persisted, validated (≥1), and shown in list, detail, and
  box-contents views.
- Forms default to `1` and provide numeric input controls for adjustment.
- Existing records without the field are safely read back as `quantity: 1`.

**Non-Goals:**

- Per-box quantity (each box tracks its own count of that item). Splitting an
  item set across boxes requires separate item records.
- Fractional or decimal quantities.
- Automatic recalculation of counts when items are moved.

## Decisions

### 1. Store `quantity` on the `Item` record directly

**Decision:** `quantity: number` is added to the `Item` interface alongside the
other fields. No separate join record or KV key.

**Rationale:** There is a one-item-one-box relationship already (`Item.boxId`).
The quantity represents "how many of this thing" the user owns as a unit. A flat
field keeps reads simple (one KV get) and matches the existing pattern for all
other item fields.

**Alternatives considered:**

- Separate `BoxItemQuantity` record: adds a second KV read on every box-detail
  page render and a join operation. Worthwhile only if items could appear in
  multiple boxes simultaneously — which is out of scope for MVP.

### 2. Default at read time for legacy records, not a migration script

**Decision:** `itemRepo.ts` wraps every `kv.get<Item>` result: if the returned
value has `quantity === undefined` it is coerced to `1` before returning to
callers. No migration script is needed.

**Rationale:** Two users, small dataset. Coercing at read is safe and
self-healing. Adding a migration adds deployment complexity (run-once scripts,
ordering risk) for a trivial amount of data. The coerce path can be removed once
all records have been naturally saved with the new field.

**Alternatives considered:**

- One-shot migration script: more explicit, but requires careful deployment
  ordering on Deno Deploy. Unnecessary for this scale.

### 3. `<input type="number">` with `min="1"` for the UI control

**Decision:** Standard HTML
`<input type="number" name="quantity" min="1"
value="1">` in new and edit forms,
validated server-side before calling the repo.

**Rationale:** No island (client-side island) is needed; server-render is
sufficient for a simple integer field. Browser-native number input provides step
controls on mobile and desktop without additional JS.

**Alternatives considered:**

- Custom increment/decrement island: nicer UX but adds client-side code for a
  one-field change. Can be added later as a UI polish task.

### 4. Validation: reject quantity < 1 server-side with an i18n error

**Decision:** The POST handler in `routes/items/new.tsx` and
`routes/items/[id]/edit.tsx` parses `quantity` from form data, defaults to `1`
if absent/blank, and returns an error if the parsed value is < 1 or not an
integer.

**Rationale:** Matches the existing validation pattern for `name` (required) and
`estimatedValue` (numeric). Keeps validation logic in the route, not the repo.

## Risks / Trade-offs

| Risk                                                                                | Mitigation                                                     |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Legacy records return `quantity: undefined` if read directly (e.g., raw KV inspect) | Document coerce-at-read in `itemRepo.ts` comments              |
| Box detail shows item quantity but doesn't reflect per-box split                    | Documented as non-goal; users create separate records to split |

## Migration Plan

No deployment-time migration required. The `undefined → 1` coerce in `findItem`
/ `listItems` handles legacy records transparently.

On archive, a follow-up note will be added to `docs/decisions/` explaining the
read-time default strategy so future contributors don't add a redundant
migration.

## Open Questions

_None — design is complete._
