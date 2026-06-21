## Why

The item edit form shows three overlapping placement fields (Behälter, Raum,
Karton) that are logically mutually exclusive — an item can only be in one place
at a time. This confuses users and leads to inconsistent data. Additionally,
assigning existing items to a box currently requires opening each item
individually; there is no destination-side bulk-packing flow.

## What Changes

- **3a — Placement picker**: Replace the three separate placement fields with a
  single "Standort" section. A segmented control lets the user choose one of
  {Raum, Karton, Behälter} and shows only the relevant sub-picker. No island
  required — implemented as a CSS/HTML radio-based toggle (`:checked` sibling
  selector).
- **3b — Destination-side packing on `/boxes/[id]`**: Add an "Einpacken" action
  that shows a list of unassigned/room-only items with checkboxes; a single
  submit assigns all selected items to this box.

## Capabilities

### New Capabilities

None — these are UX improvements to existing inventory placement and box detail
flows.

### Modified Capabilities

- `inventory`: Item placement UX consolidated into a single "Standort" picker;
  box detail gains a bulk "Einpacken" action

## Impact

- `routes/items/[id]/edit.tsx` and shared item form components — placement
  fields consolidated
- `routes/boxes/[id].tsx` — Einpacken form/section added
- `static/styles.css` — segmented control styles
- No new KV queries, no new dependencies
