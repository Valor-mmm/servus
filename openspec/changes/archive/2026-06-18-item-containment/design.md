## Context

Items currently resolve to a room either directly (`item.roomId`) or via a
moving box (`item.boxId` → `box.destinationRoomId`). There is no way to express
that one item physically lives inside another. This change adds a generic
item-to-item containment relationship so household objects (toolbox in a
cabinet, screwdriver in the toolbox) are findable after the move.

The KV item repo (`lib/inventory/itemRepo.ts`) already follows a primary-key +
secondary-index pattern: `["item", id]` plus `["item-by-category", …]`,
`["item-by-room", …]`, `["item-by-box", …]`, `["item-by-time", …]`, all kept in
sync with the primary record inside `kv.atomic()` transactions. This change
extends that pattern, it does not introduce a new one.

The app has two real users and live data; per project convention there are no
compat shims — schema changes ship with a one-shot migration script.

## Goals / Non-Goals

**Goals:**

- Model containment as a single `containerId` parent pointer on `Item`, nestable
  to any depth.
- Derive an item's room from its containment chain (root-owns-room), never
  storing a room on a contained item.
- Gate which items may act as containers via a `canContain` flag on `Category`.
- Reuse the existing box-label QR pattern for a permanent container label.

**Non-Goals:**

- Touching the moving-box (`boxes`) entity or merging it with containment.
- Per-item `canContain` override (deferred; flag lives on category only).
- Denormalising the room onto descendant items.
- Depth limits or any automatic content re-homing.

## Decisions

### Containment is a parent pointer, not a child list

`Item.containerId: string | null` points at the parent. Contents are found via a
new secondary index `["item-by-container", containerId, itemId] → true`,
mirroring `item-by-box`. **Why over a `childIds: string[]` array on the
container:** a parent pointer keeps each item the single writer of its own
membership (atomic, no read-modify-write races on a shared array), and matches
every other relationship in the repo.

### Room is derived by walking up; only the root stores `roomId`

A contained item always has stored `roomId = null`. Effective room = `roomId` of
the root ancestor (the item whose `containerId` is `null`). **Why derive over
denormalise:** at household scale (low thousands of items spread over many
rooms) walking 2–3 parents is negligible, and it eliminates the entire class of
stale-room bugs when a full container is moved. Denormalisation would buy a
faster room query we don't need and require cascading writes down the subtree on
every container move.

**Room-view consequence:** `listItemsByRoom(roomId)` must return both items
stored directly in the room _and_ items whose root resolves to that room.
Implementation: gather the room's direct items, then walk each container in that
room's subtree. Acceptable at this scale; revisit only if room views get slow.

**`listItemsByRoom` query strategy:** The `item-by-room` secondary index covers
only root items (stored `roomId ≠ null`, `containerId = null`). To enumerate all
items whose effective room is `R`, `listItemsByRoom(R)` does two passes: (1)
query `item-by-room[R]` for direct roots; (2) for each container-capable root in
that set, recursively walk `item-by-container` to collect all descendants. This
is O(containers_in_room × avg_depth) additional queries — negligible at
household scale. If room views become slow, revisit with a denormalised room
stamp; do not pre-optimise.

### Cycle protection on assignment

Before persisting a `containerId`, walk from the candidate container up to its
root. Reject if the item's own id appears in that chain (covers both
self-containment and descendant-as-container). O(depth), runs once per edit.

### Container selector: accordion-per-room with lazy load

The container selector groups containers by room in accordion panels. No
containers are pre-fetched on form load — each panel fires a request for
`listItemsByRoom(roomId, { containerOnly: true })` only when expanded. A "no
room" panel covers items whose root has `roomId: null`. Search queries
`listContainersByName(query)` which scans the `item-by-container`-capable items
with a name prefix match.

**Why lazy over eager:** A house may have containers in many rooms. Loading all
of them upfront wastes KV reads and delays the form. An accordion makes the
scope explicit for the user and keeps each interaction cheap — one room's worth
of containers per expand.

### `canContain` gates container selection at the boundary

The container selector lists only items whose category has `canContain: true`,
and the create/edit handler re-validates server-side (clients don't enforce
invariants). The flag is read from the item's category at validation time, so
flipping a category's flag does not retroactively rewrite existing `containerId`
values — it only constrains new assignments.

### Container label reuses the box-label page

The container label route mirrors `/boxes/:id/label`: same QR component, same
print CSS, same screen-only toolbar. It links the QR to the item-detail URL and
prints only the name — never the contents — so the physical label stays valid as
contents churn.

## Risks / Trade-offs

- **Room-view fan-out** → Resolving contained items into a room requires walking
  container subtrees. Mitigation: indexes make the walk shallow and bounded;
  acceptable at our scale. Revisit with denormalisation only if measured slow.
- **Orphaned `containerId` if a container item is deleted** → Deleting a
  container would leave children pointing at a missing parent (no room
  derivable). Mitigation: deletion of a container-capable item must first clear
  `containerId` on its direct children (they become root, room-less) within the
  same atomic transaction, consistent with how category/room deletes guard
  references today.
- **Flag flip leaves contradictory data** → Turning a category's `canContain`
  off while its items still contain things. Mitigation: existing `containerId`
  values are left intact (flag only gates new assignments); the contradiction is
  benign and self-heals as items are re-placed.

## Migration Plan

One-shot script (run once against live KV, no compat shim):

1. Backfill every `Category` with `canContain: false`.
2. Backfill every `Item` with `containerId: null` (no item is contained yet, so
   no `item-by-container` index entries are written).
3. No room data changes — all existing items keep their stored `roomId` as chain
   roots.

Rollback: the new fields are additive; reverting code leaves `canContain` and
`containerId` as ignored fields. No destructive step.

## Open Questions

None blocking. The deferred per-item `canContain` override and any future
moving-box/containment convergence are tracked as non-goals, not open questions.
