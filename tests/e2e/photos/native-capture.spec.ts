/**
 * E2E coverage for the unified NativePhotoCapture island in create-from-photo
 * mode: rapid multi-photo add with no reload between captures, per-photo
 * removal, and the last-photo-removal cleanup rule on a still-pending item.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.resolve("tests/e2e/fixtures/sample-item.jpg");
const R2_BASE = "https://r2-e2e.example.com";
const RUN = Date.now().toString(36);

let keyCounter = 0;

async function setupR2Mocks(page: import("@playwright/test").Page) {
  await page.route("/api/photos/upload-url", (route) => {
    const key = `e2e-native-key-${++keyCounter}-${RUN}`;
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

test("two captures attach to one item with no reload; removing one keeps the other", async ({ page }) => {
  const boxLabel = `NativeCapture-${RUN}`;

  await createBox(page, boxLabel);
  const boxUrl = page.url();

  await page.waitForLoadState("networkidle");
  await setupR2Mocks(page);

  const cameraInput = page.locator(".photo-capture input[type=file][capture]");
  const strip = page.locator(".capture-preview-strip");
  const items = page.locator(".capture-preview-item");

  // ── First photo ────────────────────────────────────────────────────────
  await cameraInput.setInputFiles(FIXTURE);
  await expect(strip).toBeVisible();
  expect(await items.count()).toBe(1);
  await expect(items.nth(0)).toHaveClass(/capture-preview-item--done/, {
    timeout: 20_000,
  });
  await expect(
    page.locator(".capture-btn span", { hasText: "(1)" }),
  ).toBeVisible();

  // Mark the page so we can detect whether a reload happens before the next
  // capture finishes.
  await page.evaluate(() => {
    (globalThis as unknown as { __noReloadMarker?: boolean })
      .__noReloadMarker = true;
  });

  // ── Second photo (appends to the same item, no page reload) ─────────────
  await cameraInput.setInputFiles(FIXTURE);
  await expect(items.nth(1)).toHaveClass(/capture-preview-item--done/, {
    timeout: 20_000,
  });
  expect(await items.count()).toBe(2);
  await expect(
    page.locator(".capture-btn span", { hasText: "(2)" }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { __noReloadMarker?: boolean })
          .__noReloadMarker,
    ),
    "no page reload should happen between the two captures",
  ).toBe(true);

  // ── Remove the first photo, keep the second ──────────────────────────────
  await items.nth(0).locator(".capture-preview-remove").click();
  await expect(items).toHaveCount(1, { timeout: 10_000 });

  // ── Finish and verify the resulting item has exactly one photo ──────────
  await page.locator("button", { hasText: "Fertig" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveURL(boxUrl);
  await expect(page.locator("li.item-row")).toHaveCount(1);

  await page.locator("a", { hasText: "(unbenannt)" }).click();
  await page.locator('a[href*="/edit"]').click();

  const photos = page.locator("img.photo-gallery-img");
  await expect(photos.first()).toBeVisible({ timeout: 10_000 });
  expect(
    await photos.count(),
    "removed photo must not be present; the appended one must remain",
  ).toBe(1);
});

test("removing the last photo in quick-add leaves no blank item", async ({ page }) => {
  await page.goto("/items/pending");
  const baseline = await page.locator("li.item-pending").count();

  await page.goto("/items/quick-add", { waitUntil: "networkidle" });
  await setupR2Mocks(page);

  const cameraInput = page.locator(".photo-capture input[type=file][capture]");
  const items = page.locator(".capture-preview-item");

  await cameraInput.setInputFiles(FIXTURE);
  await expect(items.nth(0)).toHaveClass(/capture-preview-item--done/, {
    timeout: 20_000,
  });

  await items.nth(0).locator(".capture-preview-remove").click();
  await expect(items).toHaveCount(0, { timeout: 10_000 });

  await page.goto("/items/pending");
  expect(
    await page.locator("li.item-pending").count(),
    "removing the only photo must delete the pending item, not leave it blank",
  ).toBe(baseline);
});
