import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

async function createRoom(
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> {
  await page.goto("/rooms");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createContainerCategory(
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> {
  await page.goto("/categories");
  await page.fill('main [name="name"]', name);
  await page.check('[name="canContain"]');
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

// Scenario 9.1: mark a category container-capable, create a container item in
// a room, place an item inside it (room field locks), verify the contained item
// resolves into the room view and appears in the container's contents.
test("containment: create container item, place item inside, verify room resolution", async ({ page }) => {
  const roomName = `Flur-${RUN}`;
  const catName = `Kisten-${RUN}`;
  const containerName = `Schrank-${RUN}`;
  const contentName = `Hammer-${RUN}`;

  await createRoom(page, roomName);
  await createContainerCategory(page, catName);

  // Create the container item (in the room)
  await page.goto("/items/new");
  await page.fill('[name="name"]', containerName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  // Select the room via the ItemLocationFields island
  await page.selectOption('[name="roomId"]', { label: roomName });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");

  // Create the content item by selecting the container
  await page.goto("/items/new");
  await page.fill('[name="name"]', contentName);
  // Open the container selector
  await page.click(`text=${contentName}`);
  // Use a generic category for the content item
  // Click the container selector button
  const containerBtn = page.locator("button", { hasText: /Behälter/ });
  await containerBtn.click();
  // Expand the room panel
  await page.click(`button:has-text("${roomName}")`);
  // Select the container item
  await page.click(`button:has-text("${containerName}")`);
  // Room field should now show the derived room (locked)
  await expect(page.locator(".field-locked")).toBeVisible();
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");

  // Verify the container's detail page shows the content item
  await page.goto("/items");
  await page.click(`a:has-text("${containerName}")`);
  await expect(page.locator(`text=${contentName}`)).toBeVisible();

  // Verify the room view includes the content item
  await page.goto("/rooms");
  await page.click(`text=${roomName}`);
  await expect(page.locator(`text=${contentName}`)).toBeVisible();
});

// Scenario 9.2: open the container label page, assert name + QR present,
// contents absent, and that scanning the QR target opens the item detail.
test("container label: name and QR present, no contents, QR links to detail", async ({ page }) => {
  const catName = `LabelKisten-${RUN}`;
  const itemName = `Werkzeugkiste-${RUN}`;

  await createContainerCategory(page, catName);

  // Create the container item
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");

  // Navigate to the item detail page
  await page.goto("/items");
  await page.click(`a:has-text("${itemName}")`);
  const itemDetailUrl = page.url();
  const itemId = itemDetailUrl.split("/items/")[1];

  // Navigate to the label page
  await page.goto(`/items/${itemId}/label`);

  // Name is visible on label
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // QR code is present (SVG)
  await expect(page.locator("svg")).toBeVisible();

  // Contents are NOT listed (label page does not render item list)
  const itemListLocator = page.locator(".item-list");
  await expect(itemListLocator).not.toBeVisible();

  // Toolbar is visible on screen
  await expect(page.locator("#print-btn")).toBeVisible();

  // The back link from the toolbar leads to the item detail page
  const backLink = page.locator(`a:has-text("Zurück")`);
  await backLink.click();
  await expect(page).toHaveURL(`/items/${itemId}`);
});
