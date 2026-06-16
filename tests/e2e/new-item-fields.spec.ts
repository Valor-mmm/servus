import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

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
