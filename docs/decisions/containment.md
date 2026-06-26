# Decision: item containment

**Date:** 2026-05\
**Change:** `explore/boxes-contain-items`

## Context

During the move, some items are packed inside container items (e.g. a bag inside
a box, or cutlery inside a drawer inside a cabinet). The box entity models
physical boxes, but users needed to track finer-grained nesting without
requiring a new entity type.

## Decision

Extend `Item` with a nullable `containerId: string | null` field that references
another `Item`. An item may have at most one container. Cycles are prevented at
write time via `assertNoCycle()`. A `["item-by-container", containerId, itemId]`
KV index enables efficient listing of an item's contents.

Categories gain a boolean `canContain` flag to signal which item types are valid
containers (e.g. "Behälter", "Kiste"). The UI filters the container picker to
only show `canContain` items.

`containerId` is mutually exclusive with `boxId`: assigning a container clears
the box assignment and vice versa, enforced in `updateItem`.

## Alternatives considered

- **Nested boxes** — a separate `Container` entity. Rejected: adds a third
  entity type where the existing `Item` + `canContain` flag is sufficient for a
  home inventory app.
- **Flat references without cycle guard** — rejected as a data integrity risk.

## Consequences

Container trees are limited to depth 50 (throws) to prevent runaway recursion on
corrupted data. The UI only supports one level of nesting in the picker for
simplicity; deeper nests are valid data but are surfaced as a flat list.
