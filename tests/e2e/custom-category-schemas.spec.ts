import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

test("create a custom category type, use it on a category + item, persist its fields", async ({ page }) => {
  const typeName = `Gewürz-${RUN}`;
  const catName = `Gewürze-${RUN}`;
  const itemName = `Paprika-${RUN}`;
  const heat = `scharf-${RUN}`;
  const origin = `Ungarn-${RUN}`;

  // 1. Create a custom schema type with two text fields.
  await page.goto("/categories/schemas/new");
  await page.fill('[name="name"]', typeName);
  await page.fill('[name="field_label_0"]', "Schärfe");
  await page.fill('[name="field_label_1"]', "Herkunft");
  await page.click('main form [type="submit"]');
  await expect(page).toHaveURL("/categories/schemas");
  await expect(page.locator(`text=${typeName}`)).toBeVisible();

  // 2. The new type is selectable when creating a category.
  await page.goto("/categories");
  await page.fill('main form [name="name"]', catName);
  await page.selectOption('main form [name="schemaType"]', { label: typeName });
  await page.click('main form [type="submit"]');
  await expect(page.locator(`text=${catName}`)).toBeVisible();

  // 3. Create an item in that category.
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");

  // 4. Edit the item — the custom fields render; fill and save.
  await page.click(`text=${itemName}`);
  await page.click('a[href*="/edit"]');
  await page.fill('[name="meta.schaerfe"]', heat);
  await page.fill('[name="meta.herkunft"]', origin);
  await page.click('main [type="submit"]');

  // 5. Detail page shows the custom field values, and reload persists them.
  await expect(page.locator(`text=${heat}`)).toBeVisible();
  await expect(page.locator(`text=${origin}`)).toBeVisible();
  await page.reload();
  await expect(page.locator(`text=${heat}`)).toBeVisible();
  await expect(page.locator(`text=${origin}`)).toBeVisible();
});
