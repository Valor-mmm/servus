## 1. Group entity + repository

- [x] 1.1 Add a failing unit test (in-memory KV) for `groupRepo`: create a
      group; reject a duplicate name (case-insensitive); find/list groups;
      rename; delete keeps the record gone
- [x] 1.2 Add the `Group` type to `lib/inventory/types.ts` and implement
      `lib/inventory/groupRepo.ts` group CRUD with the `["group", id]` +
      `["group-by-name", …]` keys (unique name, atomic create)

## 2. Membership (two-way) + ordering

- [x] 2.1 Add a failing integration test: `addMembership` makes the item show in
      the group's members and the group in the item's groups; add is idempotent;
      `removeMembership` clears both sides; `listMembers` returns members
      ordered by position; `reorderMembers` persists a new order
- [x] 2.2 Implement membership in `groupRepo`: `addMembership` (append position,
      idempotent, atomic both index sides), `removeMembership`, `listMembers`
      (ordered), `listItemGroups`, `reorderMembers`, `findOrCreateGroup`

## 3. Cascade cleanup

- [x] 3.1 Add a failing integration test: deleting a group removes all its
      memberships (items survive); deleting an item removes all its membership
      entries from both index sides (no orphans)
- [x] 3.2 Implement `deleteGroup` cascade and `removeAllMembershipsForItem`;
      wire the latter into `itemRepo.deleteItem`

## 4. i18n

- [x] 4.1 Add German strings to `lib/i18n/locales/de.ts` for the group list/
      detail pages, the add-to-group input + chips, reorder, and `nav.groups`

## 5. Item ↔ group UI (create-from-item, chips)

- [x] 5.1 Add a failing render test: the item edit page renders an add-to-group
      input backed by a `<datalist>` of existing group names, and the item's
      current groups as removable chips
- [x] 5.2 Implement the add-to-group control (`<datalist>`, find-or-create) and
      the group chips on the item detail/edit pages, wired to
      `findOrCreateGroup` / `addMembership` / `removeMembership`

## 6. Group views + reorder island

- [x] 6.1 Add a failing test for the group list + detail rendering (members in
      persisted order; remove control present)
- [x] 6.2 Implement `routes/groups/index.tsx` (list + create) and
      `routes/groups/[id].tsx` (detail: members, remove, rename)
- [x] 6.3 Add the `GroupReorder` island for drag-reordering members; on drop it
      POSTs the new order to a reorder handler; the plain ordered list renders
      without JS as the fallback
- [x] 6.4 Add the **Gruppen** link to `routes/mehr.tsx`

## 7. Spec sync and E2E

- [x] 7.1 Update affected specs and run `openspec validate groups --strict` (CLI
      at `~/.nvm/versions/node/v20.12.2/bin/openspec`)
- [x] 7.2 Add a Playwright E2E: from an item, add it to a new group via the
      autocomplete input; add a second item to the same group; open the group
      from Mehr → /groups; reorder the two members; reload and confirm the order
      persisted
