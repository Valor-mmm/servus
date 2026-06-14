## Why

Items today live on three axes: **what** they are (category), **where** they are
(room/box), and their structured fields (typed categories). What's missing is
**what they belong with** — a wardrobe of camping gear, a book series, "Keller-
kram". A category is the wrong tool (one per item, and it drives typed fields);
a group is a free, cross-cutting set.

This adds a lightweight **Gruppe**: a named set an item can belong to, many-to-
many, mixing categories freely. Created cheaply right from an item (type a name,
it finds-or-creates), with a dedicated group view to see and reorder its
members. It deliberately stays simple — no fields, no completeness tracking —
the opposite of the schema editor.

## What Changes

User-visible:

- **Create a group from an item.** The item detail/edit page gains an "zu Gruppe
  hinzufügen" input with autocomplete over existing group names (native
  `<datalist>`). Typing a new name creates the group; an existing name reuses
  it.
- An item shows **its groups as chips**, each removable.
- **A group view:** a Gruppen list page and a group detail page listing the
  group's members. On the detail page members can be **reordered by drag**, and
  the order persists. Members can be removed from the group there too.
- **Order is optional and emergent.** A group is just a collection until someone
  reorders it; there is no "series" mode to pick and no completeness/"5 von 7"
  tracking.
- **"Gruppen" is reached from the "Mehr" menu** (not a new bottom-nav tab — the
  nav was just restructured to make room for exactly this).

Internal:

- New `Group` entity and a two-way membership index (group→members ordered,
  item→its-groups), mirroring the existing `item-by-category` pattern.
- `itemRepo.deleteItem` is extended to clean up the deleted item's membership
  entries; deleting a group removes its memberships but never its items.

## Non-goals

- **Gap detection / completeness.** No `expectedTotal`, no "5 von 7" missing-
  number highlighting. Dropped from v1 entirely; order is the only structure.
- **Group ↔ box "location lens".** Showing where a group's members are packed is
  deferred.
- **Bulk add-from-the-group-side.** v1 manages membership from the item
  (add/remove) plus remove/reorder from the group view; picking inventory items
  to add from inside the group is deferred.
- **Tags / attributes.** The separate later checkpoint (single-item flags like
  "fragile"); not this change.
- **AI, migrations.** Additive only — the app is live, no data is rewritten.

## Capabilities

### New Capabilities

- `groups`: the Gruppe entity, item↔group membership (many-to-many, mixed
  categories), create-from-item with autocomplete, the group list/detail views
  with drag-reorder, and cascade cleanup on item/group deletion.

### Modified Capabilities

None. Item deletion gains a code touch-point (clearing the deleted item's
membership entries in `itemRepo.deleteItem`), but that behavior is specified
under the new `groups` capability's "Cascade cleanup on deletion" requirement
rather than as an `inventory` spec change.

## Impact

Code:

- `lib/inventory/types.ts` — `Group` type and a `GroupMembership` shape.
- `lib/inventory/groupRepo.ts` (new) — create/rename/delete groups (unique name,
  case-insensitive), add/remove membership, list groups, list a group's members
  (ordered), list an item's groups, reorder, cascade cleanup.
- `lib/inventory/itemRepo.ts` — `deleteItem` also clears `["item-group", id, *]`
  and the mirrored `["group-item", *, id]` entries.
- `routes/groups/` (new) — list + detail pages and handlers
  (add/remove/reorder).
- `routes/items/[id]/edit.tsx` + `routes/items/[id].tsx` — the add-to-group
  input (`<datalist>`) and the group chips.
- `routes/mehr.tsx` — add the Gruppen link.
- `islands/` — a small reorder island for the group detail page (drag), with the
  plain ordered list as the no-JS fallback.
- `lib/i18n/locales/de.ts` — group copy.
- `tests/unit`, `tests/integration`, `tests/e2e`.

Dependencies: none.

Risk: low. The main subtlety is keeping the two membership index sides
consistent (use `kv.atomic()` for each mutation) and cleaning both on item/group
deletion — covered by integration tests.
