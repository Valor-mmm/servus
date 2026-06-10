import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

async function ensureCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
}

async function ensureRoom(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/rooms");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
}

async function createItem(
  page: import("@playwright/test").Page,
  name: string,
  catLabel: string,
  roomLabel: string,
) {
  await page.goto("/items/new");
  await page.fill('[name="name"]', name);
  await page.selectOption('[name="categoryId"]', { label: catLabel });
  await page.selectOption('[name="roomId"]', { label: roomLabel });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");
}

// ── Mobile layout ─────────────────────────────────────────────────────────────

test("mobile: item rows use item-row-body / item-row-top structure", async ({ page }) => {
  const cat = `Kat-layout-${RUN}`;
  const room = `Zimmer-layout-${RUN}`;
  const shortName = `Tasse-${RUN}`;
  const longName =
    `Sehr langer Produktname der auf einem schmalen Bildschirm trunkiert werden sollte ${RUN}`;

  await ensureCategory(page, cat);
  await ensureRoom(page, room);
  await createItem(page, shortName, cat, room);
  await createItem(page, longName, cat, room);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/items");

  const rows = page.locator(".item-row");
  await expect(rows.first()).toBeVisible();

  // Every row must have the two structural containers.
  for (const row of await rows.all()) {
    await expect(row.locator(".item-row-body")).toBeVisible();
    await expect(row.locator(".item-row-top")).toBeVisible();
    await expect(row.locator(".item-row-top a")).toBeVisible();
  }
});

test("mobile: qty + button meets 44px touch target", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/items");

  const plusBtn = page.locator(".item-row .qty-controls button").last();
  await expect(plusBtn).toBeVisible();
  const box = await plusBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("mobile: item rows do not wrap into three lines (height ≤ 80px)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/items");

  const rows = page.locator(".item-row");
  await expect(rows.first()).toBeVisible();

  for (const row of await rows.all()) {
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(80);
  }
});

// ── Desktop layout ────────────────────────────────────────────────────────────

test("desktop: meta and name are on the same horizontal line", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/items");

  const firstRow = page.locator(".item-row").first();
  await expect(firstRow).toBeVisible();

  const topBox = await firstRow.locator(".item-row-top").boundingBox();
  const metaBox = await firstRow.locator(".item-row-body .meta").boundingBox();

  expect(topBox).not.toBeNull();
  expect(metaBox).not.toBeNull();

  // On desktop the body is flex-direction: row so both elements share the same
  // vertical midpoint (within a few pixels of each other).
  const topMid = topBox!.y + topBox!.height / 2;
  const metaMid = metaBox!.y + metaBox!.height / 2;
  expect(Math.abs(topMid - metaMid)).toBeLessThan(10);
});
