## Why

With authentication in place, the next move-blocking capability is inventory:
users need to catalog what they own so that items can later be assigned to boxes
and tracked through the move. Without a data model and CRUD UI for items,
categories, and rooms, the box and moving milestones (M3, M4) have nothing to
build on.

## What Changes

- Introduce the **Item** entity: the central object users create to represent a
  physical thing they own.
- Introduce the **Category** entity: a flat, admin-managed list of labels used
  to classify items (e.g. "Bücher", "Elektro", "Möbel").
- Introduce the **Room** entity: a flat, admin-managed list of destination rooms
  in the new home (e.g. "Küche", "Schlafzimmer", "Keller").
- Item includes fields for future milestones (`photoKey`, `status`) so the KV
  schema does not need to change when M3 photo capture and M6 AI classification
  land.
- Full CRUD UI for items with search by name and filter by category and room.
- Admin-only CRUD for categories and rooms.
- All user-visible strings go through the `t()` helper (German locale).

## Capabilities

### New Capabilities

- `inventory`: Create, read, update, and delete items with name, category, room,
  optional estimated value, photo key (nullable), and classification status.
  Categories and rooms are flat admin-managed lists. Indexes support fast
  lookup by category and by room.

### Modified Capabilities

_(none — this is a greenfield capability)_

## Impact

- **New routes**: `/items` (list), `/items/new` (create), `/items/:id` (detail +
  edit + delete), `/categories` (admin CRUD), `/rooms` (admin CRUD).
- **New lib modules**: `lib/inventory/itemRepo.ts`,
  `lib/inventory/categoryRepo.ts`, `lib/inventory/roomRepo.ts`,
  `lib/inventory/types.ts`.
- **KV layout**: primary keys `["item", id]`, `["category", id]`, `["room", id]`;
  indexes `["item-by-category", categoryId, itemId]`,
  `["item-by-room", roomId, itemId]`.
- **No new dependencies**: Deno standard library and existing Fresh 2 / Deno KV
  stack are sufficient.
- **Non-goals**: purchase history, invoices, warranty tracking, bulk import,
  photo upload (M3), AI classification (M6), box assignment (M3).
