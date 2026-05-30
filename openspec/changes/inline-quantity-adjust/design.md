## Context

Item quantity was added in the previous change. It's editable via the full item
edit form at `/items/:id/edit`. Users need a faster path when working through
box contents or scanning the item list during packing. The existing POST handler
pattern in both routes (`routes/boxes/[id].tsx` and `routes/items/index.tsx`) is
the right anchor for adding new actions without a separate API endpoint.

## Goals / Non-Goals

**Goals:**

- `+` and `−` buttons on every item row in box detail and item list, submitted
  via HTML form POST — no JS required.
- Minimum enforced: decrement stops at `1` (server ignores the request if
  quantity is already 1, or returns an error flash if desired).
- CSRF-safe (existing `csrf_token` hidden field pattern).
- Accessible: buttons have `aria-label` via i18n keys.

**Non-Goals:**

- Optimistic UI (no JS/island needed for this frequency of use).
- Quantity adjust on the item detail page.
- Free-text quantity input inline (that remains on the edit form).

## Decisions

### 1. POST forms with `_action` discriminator, no new routes

**Decision:** Reuse the existing multi-action POST handler patterns.

- `routes/boxes/[id].tsx` gains two new `_action` values: `qty_inc` and
  `qty_dec`, each with a hidden `itemId` field.
- `routes/items/index.tsx` gains a POST handler with the same two actions.

**Rationale:** Consistent with the established pattern (`mark_delivered`,
`remove_item`, `bulk_add`, etc.). No new route file, no new HTTP endpoint to
csrf-protect separately.

**Alternatives considered:**

- Dedicated `/items/:id/qty` PATCH endpoint: adds routing complexity for a
  two-line change.

### 2. Server silently clamps at minimum (no error for decrement at 1)

**Decision:** If `quantity` is already `1` and a `qty_dec` request arrives, the
server skips the update and redirects back normally (no error rendered). The `−`
button stays visible but does nothing, which is acceptable UX for MVP.

**Rationale:** Showing an error for "already at minimum" is noisy during
packing. The `min="1"` on the full edit form already communicates the floor.
This can be improved (disabled button via island) in a later UX polish change.

**Alternatives considered:**

- Render an error flash: more informative but adds server round-trip noise.
- Disable the `−` button client-side with an island: correct UX but adds JS for
  a minor edge case.

### 3. Item list gains a POST handler (currently GET-only)

**Decision:** Add `POST` case to `routes/items/index.tsx` handler, keeping `GET`
for the list. The form posts to `/items` with `_action=qty_inc|qty_dec` and
`itemId`.

**Rationale:** Avoids a new route file. The `define.handlers` pattern supports
multiple methods cleanly.

### 4. Button styling: use existing `.btn-small` class

**Decision:** Reuse `.btn-small` CSS class from the design system for the
`−`/`+` buttons, keeping the row compact. No new CSS needed.

## Risks / Trade-offs

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Double-tap on mobile submits twice        | POST-redirect pattern prevents duplicate if user waits; acceptable for MVP |
| `−` at 1 looks clickable but does nothing | Silent clamp is documented; visual disable deferred to UX polish           |

## Migration Plan

No data or schema changes. The `quantity` field is already on `Item`. This is
purely a UI + handler change.

## Open Questions

_None._
