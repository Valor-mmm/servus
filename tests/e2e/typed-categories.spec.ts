import { expect, test } from "@playwright/test";

// Unique suffix per test run to avoid KV collisions across concurrent runs
const RUN = Date.now().toString(36);

test("typed category: edit schema fields + warranty on an item, persist, list stays minimal", async ({ page }) => {
  const catName = `Bücher-${RUN}`;
  const itemName = `Der Hobbit-${RUN}`;
  const author = `Tolkien-${RUN}`;
  const warranty = "2030-05-01";

  // Create a category of type "Buch" (book schema).
  await page.goto("/categories");
  await page.fill('main form [name="name"]', catName);
  await page.selectOption('main form [name="schemaType"]', { label: "Buch" });
  await page.click('main form [type="submit"]');
  await expect(page.locator(`text=${catName}`)).toBeVisible();

  // Create an item in that category.
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");

  // Open the item and go to its edit page.
  await page.click(`text=${itemName}`);
  await page.click('a[href*="/edit"]');

  // The book schema's fields are rendered — fill the author + warranty.
  await page.fill('[name="meta.author"]', author);
  await page.fill('[name="warrantyUntil"]', warranty);
  await page.click('main [type="submit"]');

  // Back on the detail page: schema field + warranty are shown and persisted.
  await expect(page.locator("text=Autor")).toBeVisible();
  await expect(page.locator(`text=${author}`)).toBeVisible();
  await expect(page.locator("text=Garantie bis")).toBeVisible();

  // Reload survives.
  await page.reload();
  await expect(page.locator(`text=${author}`)).toBeVisible();

  // The item list stays minimal: name + category visible, author NOT shown.
  await page.goto("/items");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
  await expect(page.locator(`text=${author}`)).not.toBeVisible();
});
