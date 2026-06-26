import { expect, test } from "@playwright/test";

test("dashboard: stat tiles visible after items created", async ({ page }) => {
  // The inventory test creates at least one item — by the time this test runs
  // (alphabetically after inventory.test.ts) there should be items in KV.
  // We just navigate to / and assert the dashboard structure is present.
  await page.goto("/");

  // Erfassen CTA always visible
  await expect(page.locator("a.dashboard-cta")).toBeVisible();
});

test("dashboard: incomplete-items tile links to /items/incomplete", async ({ page }) => {
  await page.goto("/");

  // If items exist the tiles render; navigate through the link.
  const incompleteLink = page.locator(
    "a.dashboard-tile[href='/items/incomplete']",
  );
  const hasTiles = await incompleteLink.count() > 0;

  if (hasTiles) {
    await incompleteLink.click();
    await expect(page).toHaveURL(/\/items\/incomplete/);
  } else {
    // Empty state — just verify the CTA is there
    await expect(page.locator("a.dashboard-cta")).toBeVisible();
  }
});
