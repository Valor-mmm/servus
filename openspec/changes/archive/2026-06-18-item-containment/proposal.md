## Why

Today an item lives directly in a room, but in a real household things live
_inside other things_: a screwdriver is in a toolbox, the toolbox is in a
cabinet, the cabinet is in the hallway. Without modelling that nesting, we can
record _what_ we own but not _where to actually reach for it_. This change lets
any suitable item contain other items so that searching for a thing tells you
which container it is in — and, transitively, which room — making items findable
after the move is over.

This is deliberately separate from the temporary moving-box system (`boxes`),
which stays as-is and will be retired behind an admin flag once the move is
complete.

## What Changes

- **Containers are just items.** A new `canContain` flag on **Category**
  (default `false`) marks a category whose items may hold other items — e.g.
  "Möbel" and "Kisten" can contain, "Kleidung" cannot. Opt-in, never on by
  default.
- **Containment is a single parent pointer.** Items gain a `containerId`
  pointing at the item they sit inside. The chain can nest to any depth
  (furniture → box → item).
- **Room is derived up the chain.** An item with a `containerId` no longer owns
  a room; its room is inherited from the root of its containment chain. Only the
  root item (no container) owns an editable room — the **root-owns-room**
  invariant.
- **Room field locks when contained.** In create and edit, choosing a container
  disables the room field and shows the derived room read-only with a hint that
  the room comes from the container. Clearing the container unlocks the room
  field **empty** (the item must be re-placed).
- **Cycle protection.** Assigning a `containerId` that would create a loop (A
  inside B inside A) is rejected.
- **Container detail shows live contents.** A container item's detail page lists
  the items currently inside it, with a breadcrumb of its location (container →
  … → room).
- **Permanent label + QR for containers.** Container items get a printable label
  page (reusing the moving-box label pattern): a human-readable name and a QR
  code linking to the item detail. The label is permanent; the contents are read
  live on scan, never frozen onto the print.

## Non-goals

- **No change to moving boxes.** The `boxes` capability is untouched. Merging
  moving boxes into generic containment is explicitly out of scope.
- **No per-item `canContain` override.** The flag lives on the category only for
  now. A per-item override is anticipated but deferred.
- **No denormalised room copy-down.** Room is always derived, never stamped onto
  descendant items (the household scale makes walking the chain free).
- **No depth limit** and no automatic re-homing of contents when a container is
  moved — moving a container simply changes the derived room of everything
  inside it.

## Capabilities

### New Capabilities

- `containment`: the item-to-item parent relationship, room derivation and the
  root-owns-room invariant, cycle protection, the container contents view, and
  the permanent container label + QR page.

### Modified Capabilities

- `inventory`: Category management gains the `canContain` flag; item creation
  and item editing gain container assignment and the room-field locking
  behaviour driven by `containerId`.

## Impact

- **Types** (`lib/inventory/types.ts`): `Category.canContain: boolean`;
  `Item.containerId: string | null`.
- **Data migration**: existing categories backfilled to `canContain: false`;
  existing items backfilled to `containerId: null`. Two live users, run a
  migration script (no compat shim).
- **KV** (`lib/inventory/`): item repo needs a by-container index for fast
  contents lookup and chain walks; room-by-item queries resolve through the
  chain.
- **Routes/islands**: item create + edit forms (container select, room lock);
  item detail (contents list + breadcrumb for containers); new container label
  route mirroring `/boxes/:id/label`.
- **i18n** (`lib/i18n/locales/de.ts`): new keys for the container field, the
  derived-room hint, contents heading, and label page.
- **No new dependencies.** QR rendering reuses whatever the box label page
  already uses.
