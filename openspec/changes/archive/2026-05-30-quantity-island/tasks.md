## 1. JSON API endpoint

- [x] 1.1 Write integration test for `POST /api/items/adjust-quantity`: valid
      increment, valid decrement, floor-at-1, missing CSRF → 403,
      unauthenticated → 403, invalid delta → 400
- [x] 1.2 Create `routes/api/items/adjust-quantity.ts` with POST handler: parse
      JSON body, validate CSRF token against session, call `adjustQuantity`,
      return `{ quantity }`
- [x] 1.3 Run integration tests green

## 2. QuantityControl island

- [x] 2.1 Create `islands/QuantityControl.tsx`: accepts `itemId`,
      `initialQuantity`, `csrfToken`, `readonly` props; uses Preact signal for
      local quantity; renders `×N` label + `−`/`+` buttons (hidden when
      `readonly`)
- [x] 2.2 Implement fetch logic: POST to `/api/items/adjust-quantity`, disable
      buttons while in-flight, reconcile counter with server response, revert on
      error
- [x] 2.3 Verify island renders correct quantity on SSR (no flash of wrong
      value)

## 3. Wire island into item list

- [x] 3.1 Update `routes/items/index.tsx`: replace `<QtyButtons>` component with
      `<QuantityControl itemId={…} initialQuantity={item.quantity} csrfToken={csrfToken} readonly={false} />`
- [x] 3.2 Remove the `qty_inc` / `qty_dec` POST branches from the item list
      `POST` handler (and remove the `QtyButtons` helper function)
- [x] 3.3 If item list POST handler now has no remaining actions, remove the
      POST handler entirely

## 4. Wire island into box detail

- [x] 4.1 Update `routes/boxes/[id].tsx`: replace inline `qty_inc`/`qty_dec`
      forms with
      `<QuantityControl itemId={…} initialQuantity={item.quantity} csrfToken={csrfToken} readonly={box.status === "delivered"} />`
- [x] 4.2 Remove the `qty_inc` / `qty_dec` POST branches from the box detail
      POST handler

## 5. Update E2E tests

- [x] 5.1 Update `tests/e2e/inline_quantity.test.ts`: remove
      `await expect(page).toHaveURL(…)` navigation assertions; instead use
      `await expect(row.locator("text=×N")).toBeVisible()` directly (no page
      reload expected)
- [x] 5.2 Run the full E2E suite and confirm tests 6.1–6.6 pass

## 6. Cleanup and finalise

- [x] 6.1 Run `deno fmt` and `deno lint` — fix any issues
- [x] 6.2 Run `deno check **/*.ts` — fix any type errors
- [x] 6.3 Run `openspec validate --change quantity-island`
- [x] 6.4 Playwright E2E: confirm all 6 inline-quantity tests pass without page
      navigation and that no other E2E tests regressed
