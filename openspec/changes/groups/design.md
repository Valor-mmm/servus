# Design — groups

## The third axis

```
WHAT is it?      Category   (one; drives typed fields)
WHERE is it?     Room / Box (one location)
WHAT's it WITH?  Group      (many; free-form set)   ← this change
```

A group is deliberately the _opposite_ of the schema editor we just shipped: no
fields, no types, no completeness — just a name and a set of members, optionally
ordered.

## Data model

```ts
// lib/inventory/types.ts (additions)
export interface Group {
  id: string;
  name: string;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}
```

KV layout — two-way membership mirrors the existing `item-by-category` index so
both directions list cheaply:

```
  ["group", id]                       → Group
  ["group-by-name", name.toLowerCase()] → id          (case-insensitive uniqueness)

  ["group-item", groupId, itemId]     → { position: number }   group → members (ordered)
  ["item-group", itemId, groupId]     → true                   item  → its groups
```

`position` is a plain number used only to sort a group's members. On add we
append (`maxPosition + 1`, or the current member count). The two index sides are
written together in one `kv.atomic()` per mutation so they never diverge.

## Repository (`lib/inventory/groupRepo.ts`)

```ts
createGroup(name, note?)                 // unique name (case-insensitive)
renameGroup(id, name) / setNote(id, note)
deleteGroup(id)                          // removes all memberships, keeps items
findGroup(id) / listGroups()
findOrCreateGroup(name)                  // for the create-from-item flow
addMembership(groupId, itemId)           // idempotent; appends position
removeMembership(groupId, itemId)        // clears both index sides
listMembers(groupId): Item[]             // ordered by position
listItemGroups(itemId): Group[]          // an item's groups
reorderMembers(groupId, orderedItemIds)  // rewrites positions
removeAllMembershipsForItem(itemId)      // called by itemRepo.deleteItem
```

`listMembers` joins `["group-item", groupId, *]` → `findItem`, sorted by stored
`position`. `findOrCreateGroup` does a `["group-by-name", …]` lookup, creating
on miss.

## Cascade cleanup

- **Delete group**: scan `["group-item", groupId, *]`, and for each member
  delete both `["group-item", groupId, itemId]` and
  `["item-group", itemId, groupId]`, then the group + name keys.
- **Delete item**: `itemRepo.deleteItem` calls
  `removeAllMembershipsForItem(id)`, which scans `["item-group", id, *]` and
  deletes both sides. This is the one edit to existing inventory code. Done
  best-effort after the item's own atomic commit, consistent with how
  `deleteItem` already treats index cleanup.

## Create-from-item: island-free autocomplete

The item edit page gets:

```html
<input name="groupName" list="group-names" ... />
<datalist id="group-names">
  <option value="Campingkram"><option value="Harry Potter">…
</datalist>
```

Native `<datalist>` gives real autocomplete with **zero JavaScript**. Submitting
posts to an add-to-group handler that calls `findOrCreateGroup(name)` +
`addMembership`. Existing memberships render as chips, each a tiny POST form
that calls `removeMembership`.

## Reorder: a small island, plain list as fallback

Drag-reorder needs interactivity, so the group **detail page** uses a small
`GroupReorder` island that renders the ordered member list and lets the user
drag to reorder; on drop it POSTs the new order to a reorder handler
(`reorderMembers`). Without JS the same list still renders in persisted order —
it just isn't draggable.

**Decision: drag island over arrow buttons.** Up/down-arrow POST buttons would
be island-free but clumsy on a phone for a long set; the owner explicitly asked
for drag in v1. The island is small and the no-JS list is a clean fallback.
(Arrow buttons remain the trivial fallback if the island ever needs to be
dropped.)

## Ordering semantics

- Members sort by `position` ascending.
- On add, append at the end (`position` = max + 1), so newly added items don't
  jump the order.
- A group never explicitly reordered still has well-defined positions (assigned
  at add time), so "unordered" just means "in the order things were added" — a
  stable default, no special-casing.

## Navigation

`routes/mehr.tsx` gains a **Gruppen** link (`/groups`). No bottom-nav change —
the just-shipped Mehr menu is exactly where secondary destinations live.

## Routes

```
/groups            list of groups (name + member count) + "neue Gruppe"
/groups/[id]       detail: members (GroupReorder island) + remove + rename
```

Membership add/remove from the item side lives in the existing item edit/detail
handlers.

## Alternatives considered

- **Fold groups into categories (multi-category).** Rejected earlier — breaks
  "one category = one field schema" and conflates taxonomy with collection.
- **Separate "Series" entity with expectedTotal/gaps.** Rejected — series is
  just an ordered group; completeness is deferred entirely.
- **A new bottom-nav tab for Groups.** Rejected — the nav was just restructured;
  Groups belongs under Mehr.
- **Storing membership one-directional.** Rejected — listing an item's groups
  (on the item page) and a group's members (on the group page) are both hot
  paths; the two-way index keeps both O(members) without scans.
