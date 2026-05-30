## Why

Pressing `+` or `−` on an item row currently triggers a full-page reload, which
is jarring and slow. Replacing the HTML form buttons with a Fresh 2 island
delivers instant, in-place feedback without a round-trip page render.

## What Changes

- New Fresh 2 island (`islands/QuantityControl.tsx`) replaces the existing
  inline HTML forms for `+`/`−` buttons on the item list and box detail pages.
- A new JSON API endpoint (`/api/items/adjust-quantity`) accepts
  `{ itemId, delta, csrf_token }` and returns `{ quantity }`.
- The island optimistically updates the displayed count, then confirms (or
  reverts) on server response.
- No full-page navigation occurs when incrementing or decrementing quantity.
- The existing server-side `adjustQuantity` repo function and CSRF guard are
  reused.

## Non-goals

- Not changing quantity semantics (floor at 1, no upper bound).
- Not adding animations or visual polish beyond the quantity counter update
  itself.
- Not changing the edit-item form quantity field — that still uses a standard
  form.
- Not adding undo/redo.

## Capabilities

### New Capabilities

- `quantity-island`: Client-side island component and supporting JSON API route
  for in-place quantity adjustment.

### Modified Capabilities

- `inventory`: `+`/`−` buttons switch from HTML form POST to island-driven
  fetch; the visible requirement (buttons on item rows, clamp at 1, hidden on
  delivered boxes) is unchanged but the delivery mechanism is now client-side.

## Impact

- **New file**: `islands/QuantityControl.tsx`
- **New file**: `routes/api/items/adjust-quantity.ts`
- **Modified**: `routes/items/index.tsx` — swap `QtyButtons` component for the
  island
- **Modified**: `routes/boxes/[id].tsx` — swap inline forms for the island
- **No new external dependencies** — uses the browser `fetch` API and Preact
  signals already bundled by Fresh 2.
