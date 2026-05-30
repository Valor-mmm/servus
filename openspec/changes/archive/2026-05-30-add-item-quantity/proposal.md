## Why

Scanning every duplicate object individually is impractical — a household of 12
forks should be one item record, not twelve. Adding a quantity field lets users
record how many of each thing they own without creating redundant item entries.

## What Changes

- `Item` gains a `quantity` field: positive integer, default `1`, minimum `1`.
- Item creation form exposes a quantity input (default `1`, increment/decrement
  controls, no value below `1` accepted).
- Item edit form allows adjusting quantity.
- Item list shows quantity next to each item.
- Box detail shows each item's quantity so packers know how many units are
  inside.
- Validation rejects any quantity below `1` server-side and client-side.

## Non-goals

- Per-box quantity (distributing one item type across multiple boxes with
  different per-box counts). If a set needs splitting, create two separate item
  records. This simplifies the data model for MVP scope.
- Fractional quantities (e.g. 0.5 kg). All quantities are whole numbers.
- Automatic decrement when items are moved between boxes.

## Capabilities

### New Capabilities

_(none — quantity is an extension of an existing capability)_

### Modified Capabilities

- `inventory`: `Item` gains a required `quantity` field; creation and edit
  requirements change; list and box-detail display requirements change.

## Impact

- **`lib/inventory/types.ts`** — `Item` interface gains `quantity: number`.
- **`lib/kv/items.ts`** (or equivalent) — `createItem` and `updateItem` accept
  and persist `quantity`; existing records without the field are treated as
  `quantity: 1` at read time.
- **`routes/items/new.tsx` / `islands/NewItemForm.tsx`** — quantity input added,
  wired to server action.
- **`routes/items/[id]/edit.tsx`** — quantity input added.
- **`routes/items/index.tsx`** — quantity column in item list.
- **`routes/boxes/[id].tsx`** — quantity shown per item in box contents list.
- **`lib/i18n/locales/de.ts`** — new keys for `item.quantity`, validation
  messages.
- **No new dependencies.**
