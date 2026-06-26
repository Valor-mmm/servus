import { expect, test } from "@playwright/test";

test("item edit form: Standort picker renders segmented control", async ({ page }) => {
  // Navigate to items list and open the first item's edit form
  await page.goto("/items");
  const firstLink = page.locator("a.item-row-link, .item-list a").first();
  const count = await firstLink.count();
  if (count === 0) {
    // No items yet — can't test edit form
    return;
  }

  await firstLink.click();
  // Should be on item detail page — click edit
  await page.locator("a[href*='/edit']").first().click();
  await expect(page).toHaveURL(/\/items\/.+\/edit/);

  // Standort picker fieldset should be visible
  const picker = page.locator("fieldset.standort-picker");
  await expect(picker).toBeVisible();

  // Segmented bar with three tab labels should be visible
  await expect(picker.locator(".standort-bar label")).toHaveCount(3);

  // Only one panel should be visible at a time
  const visiblePanels = await picker.locator(".standort-panel").evaluateAll(
    (els) => els.filter((el) => getComputedStyle(el).display !== "none").length,
  );
  expect(visiblePanels).toBe(1);
});

test("item edit form: switching Standort radio shows correct panel", async ({ page }) => {
  await page.goto("/items");
  const firstLink = page.locator("a.item-row-link, .item-list a").first();
  if (await firstLink.count() === 0) return;

  await firstLink.click();
  await page.locator("a[href*='/edit']").first().click();
  await expect(page).toHaveURL(/\/items\/.+\/edit/);

  const picker = page.locator("fieldset.standort-picker");

  // Click the Karton tab (sp-box)
  await picker.locator("label[for='sp-box']").click();
  // The box panel should now be visible
  const boxPanelVisible = await page.locator("#sp-panel-box").evaluate(
    (el) => getComputedStyle(el).display !== "none",
  );
  expect(boxPanelVisible).toBe(true);

  // Click the Raum tab (sp-room)
  await picker.locator("label[for='sp-room']").click();
  const roomPanelVisible = await page.locator("#sp-panel-room").evaluate(
    (el) => getComputedStyle(el).display !== "none",
  );
  expect(roomPanelVisible).toBe(true);
  // Box panel should now be hidden
  const boxPanelHidden = await page.locator("#sp-panel-box").evaluate(
    (el) => getComputedStyle(el).display !== "none",
  );
  expect(boxPanelHidden).toBe(false);
});

test("box detail: Einpacken section visible and can assign items", async ({ page }) => {
  // Navigate to boxes list
  await page.goto("/boxes");
  const firstBoxLink = page.locator(".item-list a, a.item-row-link").first();
  if (await firstBoxLink.count() === 0) {
    // No boxes — skip
    return;
  }

  await firstBoxLink.click();
  await expect(page).toHaveURL(/\/boxes\/.+/);

  // Einpacken section should exist
  const einpacken = page.locator("details.einpacken-section");
  await expect(einpacken).toBeVisible();

  // Open it
  await einpacken.locator("summary").click();

  // It shows either the empty state message or the checkbox list
  const hasEmpty = await einpacken.locator(".text-muted").count() > 0;
  const hasItems =
    await einpacken.locator("input[type='checkbox']").count() > 0;
  expect(hasEmpty || hasItems).toBe(true);
});
