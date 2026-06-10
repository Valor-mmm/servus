## Context

`routes/items/index.tsx` renders each item as a `<li class="item-row">` with
five direct children: `<img>` (optional), `<a>`, `<span class="badge">`
(optional), `<span class="meta">`, and `<QuantityControl>`. The CSS for
`.item-row` is a single `display: flex; flex-wrap: wrap` block, which means all
five children share one wrap context. On a 375 px screen the `<a>` shrinks, the
badge and meta fall to a second line unstructured, and quantity controls get
pushed to a third partial line. There is no visual hierarchy.

## Goals / Non-Goals

**Goals:**

- Name is always fully readable (or truncates cleanly with `…`)
- On mobile (< 768 px): badge and meta text appear below the name, never beside
  quantity controls
- On desktop (≥ 768 px): name, badge, and meta remain on a single horizontal
  line — no change to desktop density
- Quantity controls are always right-aligned and vertically centred
- Thumbnail remains left-aligned, vertically centred
- Touch targets for quantity controls remain ≥ 44 px (existing design-system
  requirement)
- Layout works in both light and dark themes without additional changes

**Non-Goals:**

- Multi-column grid view
- Swipe-to-delete or swipe actions
- Changes to the box list or any other list component

## Decisions

### 1. New HTML structure inside `<li class="item-row">`

Current (flat):

```
<li class="item-row">
  <img ...>          ← optional thumbnail
  <a href>name</a>
  <span class="badge badge-pending">...</span>   ← optional
  <span class="meta">category · room</span>
  <QuantityControl>
</li>
```

New (zoned):

```
<li class="item-row">
  <img ...>                          ← optional thumbnail, left zone
  <div class="item-row-body">        ← centre zone, flex-column
    <div class="item-row-top">
      <a href>name</a>               ← truncates with text-overflow
      <span class="badge ...">       ← optional, stays on same line as name
    </div>
    <span class="meta">...</span>    ← always on its own second line
  </div>
  <QuantityControl>                  ← right zone, flex-shrink: 0
</li>
```

### 2. CSS changes

`.item-row` loses `flex-wrap: wrap` — the three zones (thumbnail, body, qty)
MUST NOT wrap:

```css
.item-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* was: wrap */
  gap: 0.75rem;
}
```

New `.item-row-body`:

```css
.item-row-body {
  flex: 1;
  min-width: 0; /* allows the flex child to shrink below content size */
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
```

New `.item-row-top`:

```css
.item-row-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.item-row-top a {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* inherit existing color/font-weight/hover rules */
}
```

`.item-row a` rules move to `.item-row-top a` (same specificity works, but the
selector must target the link inside the new wrapper).

`.meta` inside an item row gains:

```css
.item-row-body .meta {
  font-size: 0.75rem;
  color: var(--servus-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

The existing global `.meta` style can stay; this rule adds truncation for the
specific context.

### 3. Desktop override: `item-row-body` flips to row direction

Inside the existing `@media (min-width: 768px)` block, `item-row-body` switches
to a horizontal flow so the desktop experience is identical to today — one line
with name, badge, and meta side by side:

```css
@media (min-width: 768px) {
  .item-row-body {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  /* meta no longer needs truncation on desktop — plenty of room */
  .item-row-body .meta {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
}
```

On desktop `.item-row-top` still holds the name + badge; the
`<span class="meta">` becomes a sibling of `.item-row-top` inside the
now-horizontal body. The visual result is:
`[thumbnail]  Name  ● Badge  category · room  [– ×3 +]` — unchanged from today's
desktop layout.

### 4. Existing `.item-row a` rule scope

Currently `.item-row a` styles the link with `flex: 1; min-width: 0`. That rule
must be updated to `.item-row-top a` so the `flex: 1` applies only inside the
top line, not to any other anchor that might appear in the row.

## Affected Files

| File                                   | Change                                                                                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/items/index.tsx`               | Wrap link + badge in `<div class="item-row-top">`, wrap body in `<div class="item-row-body">`                                                                                                                               |
| `static/styles.css`                    | Add `.item-row-body`, `.item-row-top`, `.item-row-top a`; update `.item-row` (remove `flex-wrap: wrap`); tighten `.item-row a` selector scope; add `@media (min-width: 768px)` override to restore row direction on desktop |
| `openspec/specs/design-system/spec.md` | Add requirement: Mobile item card layout                                                                                                                                                                                    |

## Wireframes

### Mobile (375 px)

```
┌──────────────────────────────────────────┐
│ [40px] Küchenmixer              [– ×3 +] │
│        Küchengeräte · Küche              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│        Unnamed Item  ● Ausstehend [– ×1 +│  ← no thumbnail; badge on name line
│        –                                 │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ [40px] Sehr langer Produktname der…[– ×2 +] ← name truncates
│        Bücher · Arbeitszimmer            │
└──────────────────────────────────────────┘
```

### Desktop (≥ 768 px) — unchanged from today

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [40px]  Küchenmixer          Küchengeräte · Küche              [– ×3 +]  │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│         Unnamed Item  ● Ausstehend  –                          [– ×1 +]  │
└──────────────────────────────────────────────────────────────────────────┘
```
