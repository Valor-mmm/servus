## Why

Adjusting an item's quantity currently requires navigating to the item detail
page and opening the edit form — too many taps when you're standing in front of
a box counting objects. Inline +1/−1 buttons on the box detail and item list
pages make quantity corrections fast and frictionless during packing.

## What Changes

- **Box detail view** (`/boxes/:id`): each item row gains a `−` and `+` button.
  Pressing `+` increments the item's quantity by 1; pressing `−` decrements it
  by 1 (minimum 1, decrement at 1 is a no-op / shows a flash error). The updated
  quantity is displayed immediately after the POST-redirect.
- **Item list view** (`/items`): each item row gains the same `−` and `+`
  buttons, scoped to the item list page.
- Both surfaces use HTML forms with POST actions — no client-side JS required,
  works on any device.
- CSRF token is included in every adjust form (existing session CSRF pattern).

## Non-goals

- Keyboard / swipe shortcuts for quantity adjustment.
- Adjusting quantity on the item detail page (the full edit form already handles
  that).
- Bulk quantity adjustment across multiple items at once.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `inventory`: Item list view gains inline quantity adjust actions; box detail
  item rows gain inline quantity adjust actions.

## Impact

- **`routes/items/index.tsx`** — item list POST handler added; `−`/`+` forms per
  row; quantity displayed inline.
- **`routes/boxes/[id].tsx`** — two new `_action` cases (`qty_inc`, `qty_dec`)
  in the existing POST handler.
- **`lib/i18n/locales/de.ts`** — new keys for button aria-labels and the
  minimum-quantity flash message.
- **No new dependencies.**
