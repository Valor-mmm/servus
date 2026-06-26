import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

async function ensureCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  const existing = page.locator(`text=${name}`);
  if (!(await existing.isVisible())) {
    await page.fill('main [name="name"]', name);
    await page.click('main [type="submit"]');
    await expect(page.locator(`text=${name}`)).toBeVisible();
  }
}

test("9.1 create item with explicit quantity — shown in item list", async ({ page }) => {
  const cat = `Besteck-${RUN}`;
  const itemName = `Gabel-${RUN}`;

  await ensureCategory(page, cat);

  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: cat });
  await page.fill('[name="quantity"]', "12");
  await page.click('main [type="submit"]');

  await expect(page).toHaveURL("/items");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
  await expect(page.locator(`text=×12`)).toBeVisible();
});

test("9.2 edit item quantity — updated quantity shown in list", async ({ page }) => {
  const cat = `Gläser-${RUN}`;
  const itemName = `Weinglas-${RUN}`;

  await ensureCategory(page, cat);

  // Create item with default quantity
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: cat });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");

  // Open item detail, go to edit
  await page.click(`text=${itemName}`);
  await page.click(`text=Bearbeiten`);

  // Update quantity to 6
  await page.fill('[name="quantity"]', "6");
  await page.click('main [type="submit"]');

  // Back on item detail — navigate to list to check
  await page.goto("/items");
  await expect(page.locator(`text=×6`)).toBeVisible();
});

test("9.3 add item with quantity > 1 to box — quantity shown in box detail", async ({ page }) => {
  const cat = `Teller-${RUN}`;
  const itemName = `Suppenteller-${RUN}`;

  await ensureCategory(page, cat);

  // Create item with quantity 8
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: cat });
  await page.fill('[name="quantity"]', "8");
  await page.click('main [type="submit"]');

  // Create a box from the /boxes index form (redirects to box detail)
  await page.goto("/boxes");
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);
  const boxDetailUrl = page.url();
  const boxId = new URL(boxDetailUrl).pathname.split("/").pop()!;

  // Edit item to assign it to the box (click Karton tab to expose boxId select)
  await page.goto("/items");
  await page.click(`text=${itemName}`);
  await page.click(`a[href*="/edit"]`);
  await page.click('label[for="sp-box"]');
  await page.selectOption('[name="boxId"]', boxId);
  await page.click('main [type="submit"]');

  // Open box detail — item should show with ×8
  await page.goto(boxDetailUrl);
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
  await expect(page.locator(`text=×8`)).toBeVisible();
});

test("9.4 quantity 0 on create shows validation error", async ({ page }) => {
  const cat = `Messer-${RUN}`;
  const itemName = `Brotmesser-${RUN}`;

  await ensureCategory(page, cat);

  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: cat });

  // Set quantity to 0 by overriding the field (bypass browser min constraint)
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('[name="quantity"]');
    if (input) {
      input.removeAttribute("min");
      input.value = "0";
    }
  });

  await page.click('main [type="submit"]');

  // Should stay on /items/new with an error
  await expect(page).toHaveURL(/\/items\/new/);
  await expect(page.locator(".error")).toBeVisible();
});
