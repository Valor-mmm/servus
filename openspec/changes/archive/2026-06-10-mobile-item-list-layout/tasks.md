## 1. Failing unit/snapshot test for new item-row structure

- [x] 1.1 Add a test in `tests/unit/` (or extend an existing render test) that
      renders a sample `item-row` list item and asserts the presence of
      `.item-row-body`, `.item-row-top`, a truncating anchor inside `.item-row-top`,
      and a `.meta` span inside `.item-row-body`. The test MUST fail before the
      JSX change is made.

## 2. Restructure JSX in `routes/items/index.tsx`

- [x] 2.1 Inside the `items.map` block, wrap the `<a>` and the optional
      `<span class="badge badge-pending">` in a `<div class="item-row-top">`.
      Wrap that `<div>` and the `<span class="meta">` in a
      `<div class="item-row-body">`. The thumbnail `<img>` and `<QuantityControl>`
      remain as direct children of `<li class="item-row">`.

## 3. Update CSS in `static/styles.css`

- [x] 3.1 Remove `flex-wrap: wrap` from `.item-row`; set `align-items: center`
      and `flex-wrap: nowrap`.
- [x] 3.2 Add `.item-row-body` rule: `flex: 1; min-width: 0; display: flex;
      flex-direction: column; gap: 0.15rem;`
- [x] 3.3 Add `.item-row-top` rule: `display: flex; align-items: center;
      gap: 0.4rem; min-width: 0;`
- [x] 3.4 Change the selector for the link styles from `.item-row a` to
      `.item-row-top a`; keep `flex: 1; min-width: 0; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;` and the existing
      color/font-weight/hover rules.
- [x] 3.5 Add `.item-row-body .meta` rule: `font-size: 0.75rem;
      color: var(--servus-text-muted); white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis;`
- [x] 3.6 Inside the existing `@media (min-width: 768px)` block, add overrides
      for `.item-row-body`: `flex-direction: row; align-items: center; gap: 0.5rem;`
      and for `.item-row-body .meta`: `white-space: normal; overflow: visible;
      text-overflow: unset;` — this restores the single-line desktop layout.

## 4. Verify unit test passes

- [x] 4.1 Run the unit test from task 1.1 — it MUST now pass.

## 5. Update design-system spec

- [x] 5.1 Add a new requirement to `openspec/specs/design-system/spec.md`:
      **Mobile item card layout** — the item list row MUST use a three-zone
      layout (thumbnail | body | quantity controls) with `flex-wrap: nowrap`.
      The body zone MUST display the item name (with text-overflow truncation)
      and optional badge on a first line, and the meta text on a second line.
      Include one Scenario block exercising the layout at a narrow viewport.

## 6. E2E verification

- [x] 6.1 Add or extend a Playwright scenario in `tests/e2e/` that covers both
      viewports:

      **Mobile (375 × 812 px):**
      - Seeds at least two items: one with a long name, one in pending status
      - Asserts `.item-row-top` and `.item-row-body` are present for each row
      - Asserts the quantity `+` button bounding box height is ≥ 44 px
      - Asserts no `.item-row` bounding box is taller than 80 px (not wrapping
        into three lines)

      **Desktop (1280 × 800 px):**
      - Asserts `.item-row-body` has `flex-direction: row` (via computed style
        or by asserting `.item-row-body .meta` and `.item-row-top` have
        approximately the same `y` offset, i.e. they are on the same line)
