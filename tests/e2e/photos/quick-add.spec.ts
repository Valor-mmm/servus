/**
 * Task 9.5: Bottom-nav quick-add creates a photo-first item with no box
 * assignment and the item appears in /items and /items/pending.
 *
 * The bottom nav is only visible on mobile viewports. This test uses a mobile
 * viewport to click the nav link, then verifies item creation.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.resolve("tests/e2e/fixtures/sample-item.jpg");
const R2_BASE = "https://r2-e2e.example.com";

async function setupR2Mocks(page: import("@playwright/test").Page) {
  let keyCounter = 0;
  await page.route("/api/photos/upload-url", (route) => {
    const key = `e2e-quick-add-key-${++keyCounter}-${Date.now()}`;
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
    return route.fallback();
  });
}

test("quick-add bottom-nav link opens capture page; photo creates unboxed pending item", async ({ page }) => {
  // Set mobile viewport so the bottom nav is visible
  await page.setViewportSize({ width: 390, height: 844 });

  await setupR2Mocks(page);

  await page.goto("/items");
  await page.locator(".bottom-nav a.nav-quick-add").click();
  await expect(page).toHaveURL("/items/quick-add");
  // Wait for island JS to hydrate before triggering file capture
  await page.waitForLoadState("networkidle");

  const fileInput = page.locator(".photo-capture input[type=file][capture]");
  await fileInput.setInputFiles(FIXTURE);
  // Once the upload completes, the island shows a "Fertig" action.
  // Tap it to commit and let the page reload.
  await expect(page.locator("button", { hasText: "Fertig" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("button", { hasText: "Fertig" }).click();
  await page.waitForLoadState("networkidle");

  // Verify item shows in /items with pending badge
  await page.goto("/items");
  await expect(page.locator("span.badge-pending").first()).toBeVisible();
  await expect(page.locator("li.item-pending").first()).toBeVisible();

  // Verify item shows in /items/pending
  await page.goto("/items/pending");
  await expect(page.locator("li.item-pending").first()).toBeVisible();
  await expect(page.locator("text=(unbenannt)").first()).toBeVisible();
});
