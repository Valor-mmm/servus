/**
 * E2E tests for the ui-items-browse-performance change.
 * Covers: browse limit UI, category auto-submit, text search full corpus.
 */
import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

async function createCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createItem(
  page: import("@playwright/test").Page,
  name: string,
  categoryLabel: string,
) {
  await page.goto("/items/new");
  await page.fill('[name="name"]', name);
  await page.selectOption('[name="categoryId"]', { label: categoryLabel });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");
}

// ── Browse limit: load-all button loads all items ─────────────────────────────

test("browse limit — load-all button reveals all items", async ({ page }) => {
  const catName = `BrowseCat-${RUN}`;
  await createCategory(page, catName);

  // Create 55 items (above the 50-item default limit)
  for (let i = 1; i <= 55; i++) {
    await createItem(page, `BrowseItem-${RUN}-${String(i).padStart(3, "0")}`, catName);
  }

  // Default view: browse limit note and load-all button are shown
  await page.goto("/items");
  await expect(page.locator(".load-all-container a")).toBeVisible();
  const heading = await page.locator("h1").textContent();
  expect(heading).toContain("50");

  // Click load-all
  await page.click(".load-all-container a");
  await page.waitForLoadState("networkidle");

  // Load-all button should be gone
  await expect(page.locator(".load-all-container")).not.toBeVisible();

  // All 55 items should now be present
  const rows = page.locator(".item-row");
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(55);
});

// ── Category dropdown auto-submits without pressing a button ──────────────────

test("category dropdown auto-submits on change", async ({ page }) => {
  const catA = `AutoA-${RUN}`;
  const catB = `AutoB-${RUN}`;
  const itemA = `AutoItemA-${RUN}`;
  const itemB = `AutoItemB-${RUN}`;

  await createCategory(page, catA);
  await createCategory(page, catB);
  await createItem(page, itemA, catA);
  await createItem(page, itemB, catB);

  await page.goto("/items?all=1");

  // Confirm both items are visible before filtering
  await expect(page.locator(`text=${itemA}`)).toBeVisible();
  await expect(page.locator(`text=${itemB}`)).toBeVisible();

  // Select catA — should auto-submit without clicking any button
  await page.selectOption('[name="cat"]', { label: catA });
  await page.waitForLoadState("networkidle");

  // Only itemA should be visible
  await expect(page.locator(`text=${itemA}`)).toBeVisible();
  await expect(page.locator(`text=${itemB}`)).not.toBeVisible();

  // URL should now contain ?cat=
  expect(page.url()).toContain("cat=");
});

// ── Text search uses full corpus, not just recent 50 ─────────────────────────

test("text search finds items outside the recent 50", async ({ page }) => {
  const catName = `SearchCat-${RUN}`;
  const oldItem = `OldUnique-${RUN}-SearchTarget`;
  const recentPrefix = `SearchFiller-${RUN}`;

  await createCategory(page, catName);

  // Create the target item first (it will be the oldest)
  await createItem(page, oldItem, catName);

  // Create 55 more items so the target item falls outside the recent 50
  for (let i = 1; i <= 55; i++) {
    await createItem(page, `${recentPrefix}-${String(i).padStart(3, "0")}`, catName);
  }

  // Default view: target item should NOT appear (it's outside the recent 50)
  await page.goto("/items");
  await expect(page.locator(`text=${oldItem}`)).not.toBeVisible();

  // Search by unique part of target item name — should find it in the full corpus
  await page.fill('[name="q"]', "SearchTarget");
  await page.click('main .btn-icon[type="submit"]');
  await page.waitForLoadState("networkidle");

  await expect(page.locator(`text=${oldItem}`)).toBeVisible();
  // Filler items should not appear (name doesn't match)
  await expect(page.locator(`text=${recentPrefix}-001`)).not.toBeVisible();
});
