## Why

On a ~375 px mobile screen the item list row is unusable. The current `item-row`
layout is a single `flex-wrap` container whose children — optional thumbnail,
item name link, pending badge, category · room meta text, and the
`QuantityControl` island — all share one flat flow. Because the name has
`flex: 1` it can shrink to a few characters, and when the remaining children
overflow they wrap into a second line with no alignment structure: the badge and
meta text stack on top of the quantity controls, text overlaps, and tap targets
collapse. The app's two primary users operate mostly on phones; this is a
day-to-day pain point.

## What Changes

The item list row is restructured into a proper two-zone card:

- **Left zone**: optional thumbnail (fixed 40 × 40 px, unchanged size).
- **Centre zone** (`item-row-body`): a flex-column block that stretches to fill
  available width between the thumbnail and quantity controls.
  - First line: item name link (truncates with ellipsis if needed) + pending
    badge (if present), on the same line.
  - Second line: category · room meta text in muted style.
- **Right zone**: `QuantityControl` island (flex-shrink: 0, aligned to centre).

On desktop (≥ 768 px) a `@media` override flips `item-row-body` back to
`flex-direction: row`, so name, badge, and meta sit on a single horizontal line
exactly as they do today — no density regression on wide screens.
No new route, no new island, no JS changes — this is a CSS restructure plus a
small JSX change in `routes/items/index.tsx`.

## Capabilities

### Modified Capabilities

- `inventory / item list`: The visual presentation of each item row changes. All
  data fields (name, badge, meta, quantity) remain present; only layout changes.

### New Capabilities

_(none)_

## Impact

- **Changed files**: `routes/items/index.tsx` (JSX structure of `item-row`),
  `static/styles.css` (new `.item-row-body`, `.item-row-top` rules; update
  `.item-row`, `.item-row a`, `.meta` rules)
- **No new dependencies**
- **No spec-breaking changes** — all existing design-system requirements
  (touch targets ≥ 44 px, mobile bottom nav, etc.) are preserved or improved

## Non-goals

- Changing any item data, sort order, filter logic, or server-side handler
- Redesigning the box list row (separate change if needed)
- Infinite scroll or virtual list optimisation
- Card-grid view (as opposed to a single-column list)
- Any change to the `QuantityControl` island's internal behaviour
