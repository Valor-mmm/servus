import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

test("create a group from an item, add a second item, reorder members, persist", async ({ page }) => {
  const catName = `GruppenKat-${RUN}`;
  const itemA = `Alpha-${RUN}`;
  const itemB = `Beta-${RUN}`;
  const groupName = `Campingkram-${RUN}`;

  // Category + two items.
  await page.goto("/categories");
  await page.fill('main form [name="name"]', catName);
  await page.click('main form [type="submit"]');
  await expect(page.locator(`text=${catName}`)).toBeVisible();

  for (const name of [itemA, itemB]) {
    await page.goto("/items/new");
    await page.fill('[name="name"]', name);
    await page.selectOption('[name="categoryId"]', { label: catName });
    await page.click('main [type="submit"]');
    await expect(page).toHaveURL("/items");
  }

  // From item A: create the group via the add-to-group input.
  await page.click(`text=${itemA}`);
  await page.click('a[href*="/edit"]');
  await page.fill('[name="groupName"]', groupName);
  await page.click('.add-to-group button[type="submit"]');
  // chip now shows the group
  await expect(page.locator(`.group-chips >> text=${groupName}`)).toBeVisible();

  // From item B: add to the same (existing) group by name.
  await page.goto("/items");
  await page.click(`text=${itemB}`);
  await page.click('a[href*="/edit"]');
  await page.fill('[name="groupName"]', groupName);
  await page.click('.add-to-group button[type="submit"]');
  await expect(page.locator(`.group-chips >> text=${groupName}`)).toBeVisible();

  // Reach the group via the Mehr menu.
  await page.goto("/mehr");
  await page.locator('.menu-list a[href="/groups"]').click();
  await expect(page).toHaveURL("/groups");
  await page.click(`text=${groupName}`);

  // Members are in add order: Alpha, Beta.
  const before = await page.locator(".group-members a").allTextContents();
  expect(before).toEqual([itemA, itemB]);

  // Move Beta up, then save.
  await page.locator(".group-members li", { hasText: itemB })
    .locator('button[aria-label="↑"]').click();
  await page.click('.group-reorder button[type="submit"]');

  // Reload: the new order (Beta, Alpha) persisted.
  await expect(page).toHaveURL(/\/groups\//);
  const after = await page.locator(".group-members a").allTextContents();
  expect(after).toEqual([itemB, itemA]);
});
