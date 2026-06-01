/**
 * Task 3.1: Multi-photo capture — two photos captured in one session attach
 * to a single item rather than creating two separate items.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.resolve("tests/e2e/fixtures/sample-item.jpg");
const R2_BASE = "https://r2-e2e.example.com";
const RUN = Date.now().toString(36);

let keyCounter = 0;

async function setupR2Mocks(page: import("@playwright/test").Page) {
  await page.route("/api/photos/upload-url", (route) => {
    const key = `e2e-multi-key-${++keyCounter}-${RUN}`;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ key, url: `${R2_BASE}/${key}` }),
    });
  });

  await page.route(`${R2_BASE}/**`, (route) => {
    const method = route.request().method();
    if (method === "OPTIONS" || method === "PUT") {
      return route.fulfill({
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "image/jpeg",
        path: FIXTURE,
      });
    }
    return route.fallback();
  });
}

async function createBox(
  page: import("@playwright/test").Page,
  label: string,
) {
  await page.goto("/boxes");
  await page.fill('[name="label"]', label);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);
}

test("two quick-add photos attach to one item, not two", async ({ page }) => {
  const boxLabel = `MultiPhoto-${RUN}`;

  await createBox(page, boxLabel);
  const boxUrl = page.url();

  await page.waitForLoadState("networkidle");
  await setupR2Mocks(page);

  const fileInput = page.locator(".photo-capture input[type=file]");

  // ── First photo ──────────────────────────────────────────────────────────
  await fileInput.setInputFiles(FIXTURE);

  // Island must switch to the multi-photo state after the first capture.
  // "Weiteres Foto" is a <label> (wraps the file input); "Fertig" is a <button>.
  const multiContainer = page.locator(".photo-capture--multi");
  const finishBtn = page.locator("button", { hasText: "Fertig" });
  await expect(
    multiContainer,
    "multi-photo container must appear after 1st photo",
  ).toBeVisible({ timeout: 20_000 });
  await expect(finishBtn).toBeVisible();
  await expect(multiContainer.locator("span", { hasText: "Weiteres Foto" }))
    .toBeVisible();

  // ── Second photo (append to same item) ───────────────────────────────────
  const secondInput = page.locator(".photo-capture--multi input[type=file]");
  await secondInput.setInputFiles(FIXTURE);

  // Multi-photo container should still be present after appending
  await expect(multiContainer).toBeVisible({ timeout: 10_000 });

  // ── Finish and reload ────────────────────────────────────────────────────
  await finishBtn.click();
  await page.waitForLoadState("networkidle");

  // Box detail must show exactly ONE item row (not two)
  const itemRows = page.locator("li.item-row");
  await expect(itemRows.first()).toBeVisible();
  expect(
    await itemRows.count(),
    "two photos should attach to one item, not create two",
  ).toBe(1);

  // ── Navigate to the item's edit page and count photos ───────────────────
  await page.locator("a", { hasText: "(unbenannt)" }).click();
  await page.locator('a[href*="/edit"]').click();

  // Item edit page shows both photos as <img class="photo-gallery-img">
  const photos = page.locator("img.photo-gallery-img");
  await expect(photos.first()).toBeVisible({ timeout: 10_000 });
  expect(
    await photos.count(),
    "item edit page must show 2 photos",
  ).toBe(2);

  // Verify we're still on the same box after reload
  await page.goto(boxUrl);
  await expect(page.locator("li.item-row")).toHaveCount(1);
});
