## Why

The current three-value `ItemStatus` (`pending | suggested | confirmed`) is
confusing: `suggested` is unused, and `pending` vs `confirmed` map poorly to the
move workflow. Renaming to `incomplete | complete` makes the status
self-explanatory and aligns the sequential triage UI with a productive
one-by-one review flow during the move.

## What Changes

- **BREAKING** `ItemStatus` values `"pending"`, `"suggested"`, and `"confirmed"`
  are replaced by `"incomplete"` and `"complete"`.
- Photo-first capture creates items with `status: "incomplete"` (was
  `"pending"`).
- Standard form submission creates items with `status: "complete"` (was
  `"confirmed"`).
- The item edit form gains two explicit save buttons: **"Speichern & fertig"**
  (saves with `status: "complete"`) and **"Speichern & unvollständig"** (saves
  with `status: "incomplete"`). Editing no longer silently preserves status.
- `/items/pending` is renamed to `/items/incomplete`; the old URL issues a 301
  redirect.
- The triage page switches from a flat list to a **sequential, one-at-a-time
  editor**: shows the current item's full edit form inline, auto-advances to the
  next incomplete item on save, and displays index + total for orientation.
  Prev/next navigation links allow manual stepping.

### Non-goals

- No AI-assisted auto-fill in this change.
- No bulk confirm/dismiss action.
- No change to box packing-status logic (`"empty" | "packed" | "delivered"`).

## Capabilities

### New Capabilities

_(none — all changes are modifications to the existing inventory capability)_

### Modified Capabilities

- `inventory`: `ItemStatus` type, photo-first default, standard-form default,
  edit-form save semantics, triage route path and UX.

## Impact

- `lib/inventory/types.ts`: `ItemStatus` literal union changed.
- `lib/inventory/itemRepo.ts`: defaults for `createItem` and `updateItem` status
  handling.
- All routes, islands, and components that reference `"pending"` / `"confirmed"`
  / `"suggested"`.
- `routes/items/pending.tsx` → `routes/items/incomplete.tsx` (old file becomes a
  301 redirect shim).
- i18n: new keys for the two save buttons and triage empty-state copy.
- Migration: existing items with `status: "pending"` → `"incomplete"`;
  `"confirmed"` and `"suggested"` → `"complete"`.
- All unit, integration, and E2E tests that reference the old status values.
