import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);
const MOBILE = { width: 390, height: 844 };

test("new item: schema fields appear live on category change, group autocomplete works", async ({ page }) => {
  const catName = `Buch-${RUN}`;
  const groupName = `AutoCamp-${RUN}`;
  const itemName = `Hobbit-${RUN}`;
  const author = `Tolkien-${RUN}`;

  // A typed (book) category, and a group to autocomplete against.
  await page.goto("/categories");
  await page.fill('main form [name="name"]', catName);
  await page.selectOption('main form [name="schemaType"]', { label: "Buch" });
  await page.click('main form [type="submit"]');
  await expect(page.locator(`text=${catName}`)).toBeVisible();

  await page.goto("/groups");
  await page.fill('main form [name="name"]', groupName);
  await page.click('main form [type="submit"]');
  await page.waitForLoadState("networkidle");

  // New item page: the schema fields are NOT shown until a typed category is picked.
  await page.goto("/items/new");
  await expect(page.locator('[name="meta.author"]')).toHaveCount(0);

  // Pick the book category → its fields appear live (no save).
  await page.selectOption('[name="categoryId"]', { label: catName });
  await expect(page.locator('[name="meta.author"]')).toBeVisible();

  await page.fill('[name="name"]', itemName);
  await page.fill('[name="meta.author"]', author);

  // Group autocomplete: typing a prefix shows the existing group; click it.
  await page.fill('[name="groupName"]', `AutoCamp-${RUN}`.slice(0, 5));
  await expect(page.locator(".autocomplete-list")).toBeVisible();
  await page.locator(".autocomplete-list button", { hasText: groupName })
    .click();
  await expect(page.locator('[name="groupName"]')).toHaveValue(groupName);

  await page.click('main form > button[type="submit"]');
  await expect(page).toHaveURL("/items");

  // Open the new item: the schema field and the group both persisted.
  await page.click(`text=${itemName}`);
  await expect(page.locator("text=Autor")).toBeVisible();
  await expect(page.locator(`text=${author}`)).toBeVisible();
  await expect(page.locator(`.group-chips >> text=${groupName}`)).toBeVisible();
});

test("new item: mobile viewport (390×844) — form submits and redirects correctly", async ({ page }) => {
  await page.setViewportSize(MOBILE);

  const itemName = `MobileItem-${RUN}`;

  await page.goto("/items/new");

  // Bottom nav must be visible at mobile width
  await expect(page.locator("nav.bottom-nav")).toBeVisible();

  // The submit button must be within the viewport (not hidden behind bottom nav)
  const submitBtn = page.locator('main form > button[type="submit"]');
  await expect(submitBtn).toBeVisible();
  const box = await submitBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThan(MOBILE.height);

  // Fill name and submit — must land on /items
  await page.fill('[name="name"]', itemName);
  await submitBtn.click();
  await expect(page).toHaveURL("/items");

  // Item appears in the list at mobile width with no overflow
  const row = page.locator("li.item-row", {
    has: page.locator(`text=${itemName}`),
  });
  await expect(row).toBeVisible();
  const rowBox = await row.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(rowBox!.width).toBeLessThanOrEqual(MOBILE.width);
});
