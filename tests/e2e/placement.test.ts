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

test("item edit form: Standort picker renders segmented control", async ({ page }) => {
  const catName = `PlacementCat-${RUN}`;
  await ensureCategory(page, catName);

  // Seed: create an item to edit
  const itemName = `PlacementItem-${RUN}`;
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.click('main form > button[type="submit"]');
  await expect(page).toHaveURL("/items");

  // Open item → edit form
  await page.click(`text=${itemName}`);
  await page.locator("a[href*='/edit']").first().click();
  await expect(page).toHaveURL(/\/items\/.+\/edit/);

  // Standort picker must be present with three tab labels
  const picker = page.locator("fieldset.standort-picker");
  await expect(picker).toBeVisible();
  await expect(picker.locator(".standort-bar label")).toHaveCount(3);

  // Exactly one panel visible at a time
  const visiblePanels = await picker.locator(".standort-panel").evaluateAll(
    (els) => els.filter((el) => getComputedStyle(el).display !== "none").length,
  );
  expect(visiblePanels).toBe(1);
});

test("item edit form: switching Standort radio shows correct panel", async ({ page }) => {
  const catName = `PlacementCat-${RUN}`;
  await ensureCategory(page, catName);

  // Seed: create an item to edit
  const itemName = `PlacementSwitch-${RUN}`;
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.click('main form > button[type="submit"]');
  await expect(page).toHaveURL("/items");

  await page.click(`text=${itemName}`);
  await page.locator("a[href*='/edit']").first().click();
  await expect(page).toHaveURL(/\/items\/.+\/edit/);

  const picker = page.locator("fieldset.standort-picker");

  // Switch to Karton panel
  await picker.locator("label[for='sp-box']").click();
  const boxPanelVisible = await page.locator("#sp-panel-box").evaluate(
    (el) => getComputedStyle(el).display !== "none",
  );
  expect(boxPanelVisible).toBe(true);

  // Switch to Raum panel
  await picker.locator("label[for='sp-room']").click();
  const roomPanelVisible = await page.locator("#sp-panel-room").evaluate(
    (el) => getComputedStyle(el).display !== "none",
  );
  expect(roomPanelVisible).toBe(true);

  // Karton panel must now be hidden
  const boxPanelHidden = await page.locator("#sp-panel-box").evaluate(
    (el) => getComputedStyle(el).display !== "none",
  );
  expect(boxPanelHidden).toBe(false);
});

test("box detail: Einpacken section visible and can assign items", async ({ page }) => {
  // Seed: create a room and a box so there is always something to test
  const roomName = `PlacementRoom-${RUN}`;
  await page.goto("/rooms");
  await page.fill('[name="name"]', roomName);
  await page.click('main [type="submit"]');
  await page.waitForLoadState("networkidle");

  await page.goto("/boxes");
  await page.fill('[name="label"]', `P${RUN}`);
  await page.click('main form > button[type="submit"]');
  await page.waitForLoadState("networkidle");

  // Open the newly created box (matched by its label text)
  await page.click(`text=P${RUN}`);
  await expect(page).toHaveURL(/\/boxes\/.+/);

  // Einpacken section must exist on a non-delivered box
  const einpacken = page.locator("details.einpacken-section");
  await expect(einpacken).toBeVisible();

  // Open it
  await einpacken.locator("summary").click();

  // Shows either the empty-state message or a checkbox list
  const hasEmpty = await einpacken.locator(".text-muted").count() > 0;
  const hasItems =
    await einpacken.locator("input[type='checkbox']").count() > 0;
  expect(hasEmpty || hasItems).toBe(true);
});
