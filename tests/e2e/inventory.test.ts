import { expect, test } from "@playwright/test";

// Unique suffix per test run to avoid KV collisions across concurrent runs
const RUN = Date.now().toString(36);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createRoom(page: import("@playwright/test").Page, name: string) {
  await page.goto("/rooms");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createItem(
  page: import("@playwright/test").Page,
  name: string,
  categoryLabel: string,
  roomLabel?: string,
) {
  await page.goto("/items/new");
  await page.fill('[name="name"]', name);
  await page.selectOption('[name="categoryId"]', { label: categoryLabel });
  if (roomLabel) {
    await page.selectOption('[name="roomId"]', { label: roomLabel });
  }
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");
}

// ── 11.1: Create category, room, item — appears in list and filtered views ───

test("create category, room, item — item appears in list and filtered views", async ({ page }) => {
  const catName = `Bücher-${RUN}`;
  const roomName = `Küche-${RUN}`;
  const itemName = `Kochbuch-${RUN}`;

  await createCategory(page, catName);
  await createRoom(page, roomName);
  await createItem(page, itemName, catName, roomName);

  // Unfiltered list: item visible
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // Filter by category via UI dropdown (auto-submits on change)
  await page.selectOption('[name="cat"]', { label: catName });
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // Filter by room via UI dropdown (clear category filter first)
  await page.selectOption('[name="cat"]', { value: "" });
  await page.waitForLoadState("networkidle");
  await page.selectOption('[name="room"]', { label: roomName });
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
});

// ── 11.2: Edit item category — old filter gone, new filter shows item ─────────

test("edit item category — old filter gone, new filter shows item", async ({ page }) => {
  const cat1 = `Elektro-${RUN}`;
  const cat2 = `Möbel-${RUN}`;
  const itemName = `Stehlampe-${RUN}`;

  await createCategory(page, cat1);
  await createCategory(page, cat2);
  await createItem(page, itemName, cat1);

  // Edit: change to cat2
  await page.click(`text=${itemName}`);
  await page.click(`a[href*="/edit"]`);
  await page.selectOption('[name="categoryId"]', { label: cat2 });
  await page.click('main [type="submit"]');

  // Old category filter: item should NOT appear
  await page.goto("/items");
  await page.selectOption('[name="cat"]', { label: cat1 });
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`text=${itemName}`)).not.toBeVisible();

  // New category filter: item should appear
  await page.selectOption('[name="cat"]', { label: cat2 });
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
});

// ── 11.3: Delete item — item no longer in list ────────────────────────────────

test("delete item — item no longer appears in list", async ({ page }) => {
  const catName = `Kleidung-${RUN}`;
  const itemName = `Jacke-${RUN}`;

  await createCategory(page, catName);
  await createItem(page, itemName, catName);

  // Navigate to detail and delete
  await page.click(`text=${itemName}`);
  page.once("dialog", (d) => d.accept());
  await page.click("main button.btn-danger");

  await expect(page).toHaveURL("/items");
  await expect(page.locator(`text=${itemName}`)).not.toBeVisible();
});

// ── 11.4: Delete category in use — error shown, category persists ─────────────

test("delete referenced category shows error and category persists", async ({ page }) => {
  const catName = `Werkzeug-${RUN}`;
  const itemName = `Hammer-${RUN}`;

  await createCategory(page, catName);
  await createItem(page, itemName, catName);

  // Attempt to delete the in-use category
  await page.goto("/categories");
  const row = page.locator("li.item-row", { hasText: catName });
  page.once("dialog", (d) => d.accept());
  await row.locator("button.btn-danger").click();

  // Error shown, category still listed
  await expect(page.locator(".error")).toBeVisible();
  await expect(page.locator(`text=${catName}`)).toBeVisible();
});

// ── 11.5: Search by name — only matching items shown ─────────────────────────

test("search by name — only matching items shown", async ({ page }) => {
  const catName = `Küche-cat-${RUN}`;
  const itemA = `Mixer-${RUN}`;
  const itemB = `Toaster-${RUN}`;

  await createCategory(page, catName);
  await createItem(page, itemA, catName);
  await createItem(page, itemB, catName);

  // Search for itemA — only itemA should be visible
  await page.goto("/items");
  await page.fill('[name="q"]', "Mixer");
  await page.click('main .btn-icon[type="submit"]');
  await expect(page.locator(`text=${itemA}`)).toBeVisible();
  await expect(page.locator(`text=${itemB}`)).not.toBeVisible();
});
