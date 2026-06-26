import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

async function ensureCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  if (!(await page.locator(`text=${name}`).isVisible())) {
    await page.fill('main [name="name"]', name);
    await page.click('main [type="submit"]');
    await expect(page.locator(`text=${name}`)).toBeVisible();
  }
}

async function createItemWithQty(
  page: import("@playwright/test").Page,
  name: string,
  cat: string,
  qty: number,
) {
  await page.goto("/items/new");
  await page.fill('[name="name"]', name);
  await page.selectOption('[name="categoryId"]', { label: cat });
  await page.fill('[name="quantity"]', String(qty));
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");
}

// ── Item list ─────────────────────────────────────────────────────────────────

test("6.1 + button on item list increments quantity", async ({ page }) => {
  const cat = `Besteck-${RUN}`;
  const name = `GabelInc-${RUN}`;
  await ensureCategory(page, cat);
  await createItemWithQty(page, name, cat, 3);

  await page.goto("/items");
  const row = page.locator(".item-row", { hasText: name });
  await expect(row.locator("text=×3")).toBeVisible();

  // Click + button in that row — no page reload expected
  await row.locator(`button[aria-label="Anzahl erhöhen"]`).click();

  await expect(row.locator("text=×4")).toBeVisible();
});

test("6.2 − button on item list decrements quantity", async ({ page }) => {
  const cat = `Teller-${RUN}`;
  const name = `TellerDec-${RUN}`;
  await ensureCategory(page, cat);
  await createItemWithQty(page, name, cat, 5);

  await page.goto("/items");
  const row = page.locator(".item-row", { hasText: name });
  await row.locator(`button[aria-label="Anzahl verringern"]`).click();

  await expect(row.locator("text=×4")).toBeVisible();
});

test("6.3 − button at quantity 1 keeps quantity at 1", async ({ page }) => {
  const cat = `Glas-${RUN}`;
  const name = `GlasMin-${RUN}`;
  await ensureCategory(page, cat);
  await createItemWithQty(page, name, cat, 1);

  await page.goto("/items");
  const row = page.locator(".item-row", { hasText: name });

  // Click − when quantity is 1 — should stay at ×1
  await row.locator(`button[aria-label="Anzahl verringern"]`).click();

  await expect(row.locator("text=×1")).toBeVisible();
});

// ── Box detail ────────────────────────────────────────────────────────────────

async function createBoxAndAssignItem(
  page: import("@playwright/test").Page,
  itemName: string,
  catName: string,
  qty: number,
): Promise<string> {
  await ensureCategory(page, catName);
  await createItemWithQty(page, itemName, catName, qty);

  // Create box
  await page.goto("/boxes");
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);
  const boxDetailUrl = page.url();
  const boxId = new URL(boxDetailUrl).pathname.split("/").pop()!;

  // Assign item to box via edit form (click Karton tab first to expose boxId select)
  await page.goto("/items");
  await page.click(`text=${itemName}`);
  await page.click(`a[href*="/edit"]`);
  await page.click('label[for="sp-box"]');
  await page.selectOption('[name="boxId"]', boxId);
  await page.click('main [type="submit"]');

  return boxDetailUrl;
}

test("6.4 + button in box detail increments quantity", async ({ page }) => {
  const cat = `Küche-${RUN}`;
  const name = `LöffelInc-${RUN}`;
  const boxUrl = await createBoxAndAssignItem(page, name, cat, 4);

  await page.goto(boxUrl);
  const row = page.locator(".item-row", { hasText: name });
  await expect(row.locator("text=×4")).toBeVisible();

  await row.locator(`button[aria-label="Anzahl erhöhen"]`).click();

  await expect(row.locator("text=×5")).toBeVisible();
});

test("6.5 − button in box detail decrements quantity", async ({ page }) => {
  const cat = `Wohnzimmer-${RUN}`;
  const name = `VaseDec-${RUN}`;
  const boxUrl = await createBoxAndAssignItem(page, name, cat, 6);

  await page.goto(boxUrl);
  const row = page.locator(".item-row", { hasText: name });
  await row.locator(`button[aria-label="Anzahl verringern"]`).click();

  await expect(row.locator("text=×5")).toBeVisible();
});

test("6.6 delivered box shows no +/- buttons", async ({ page }) => {
  const cat = `Schlafzimmer-${RUN}`;
  const name = `KisseDelivered-${RUN}`;
  const boxUrl = await createBoxAndAssignItem(page, name, cat, 2);

  // Mark box as delivered
  await page.goto(boxUrl);
  await page.click('button:has-text("Als geliefert markieren")');
  await expect(page).toHaveURL(/delivered=1/);

  // No +/- buttons on item rows
  await expect(
    page.locator(`button[aria-label="Anzahl erhöhen"]`),
  ).not.toBeVisible();
  await expect(
    page.locator(`button[aria-label="Anzahl verringern"]`),
  ).not.toBeVisible();
});
