## Context

The item edit form has three separate `<select>` fields for Behälter, Raum, and
Karton that are logically mutually exclusive. Users can technically set all
three, which creates inconsistent data. The box detail page has no way to assign
multiple existing items at once.

## Goals / Non-Goals

**Goals:**
- Single "Standort" section with a radio-based segmented control
- Only one sub-picker visible at a time (CSS `:checked` sibling selector, no JS)
- Bulk "Einpacken" form on `/boxes/[id]` using checkboxes

**Non-Goals:**
- New island or client-side framework
- Drag-and-drop reordering
- Changing the underlying KV data model

## Decisions

**3a — Segmented control** (CSS-only, no island):

```html
<fieldset class="standort-picker">
  <legend>Standort</legend>
  <label><input type="radio" name="standort_type" value="room"> Raum</label>
  <label><input type="radio" name="standort_type" value="box"> Karton</label>
  <label><input type="radio" name="standort_type" value="container"> Behälter</label>
  <div class="standort-panel" data-for="room">…room select…</div>
  <div class="standort-panel" data-for="box">…box select…</div>
  <div class="standort-panel" data-for="container">…container select…</div>
</fieldset>
```

CSS: `.standort-panel` hidden by default; shown when preceding sibling radio
`:checked` via adjacent/general sibling combinator. Server renders the active
radio pre-checked based on current item state.

The route handler reads `standort_type` from POST body to determine which of
`roomId`, `boxId`, `containerId` to set; clears the other two.

**3b — Einpacken form** on `/boxes/[id]`*:

Add a collapsible `<details>` section "Gegenstände einpacken" below the item
list. Fetches all items that have no box assigned (`item.boxId === null`).
Renders a checkbox list; submit calls `updateItem` for each checked item.
Redirect back to `/boxes/[id]` after commit.

## Risks / Trade-offs

CSS-only placement picker has a known limitation: browsers that don't support
general sibling selectors (pre-2015) won't show sub-pickers. All target browsers
(Chrome, Safari, Firefox current) support this. The server-side "which radio is
pre-checked" logic adds a small branch in the render path.
