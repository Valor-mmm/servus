/**
 * Task 9.4: Two photo-first items appear in /items/pending and /items with
 * the pending badge.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { denyGetUserMedia } from "../helpers/camera.ts";

const FIXTURE = path.resolve("tests/e2e/fixtures/sample-item.jpg");
const R2_BASE = "https://r2-e2e.example.com";

let keyCounter = 0;

async function setupR2Mocks(page: import("@playwright/test").Page) {
  await page.route("/api/photos/upload-url", (route) => {
    const key = `e2e-pending-list-key-${++keyCounter}-${Date.now()}`;
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

async function captureOneItem(page: import("@playwright/test").Page) {
  const fileInput = page.locator(".photo-capture input[type=file]");
  await fileInput.setInputFiles(FIXTURE);
  // After the first create the island shows "Weiteres Foto" + "Fertig".
  // Tap Fertig to commit and let the page reload.
  await expect(page.locator("button", { hasText: "Fertig" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("button", { hasText: "Fertig" }).click();
  await page.waitForLoadState("networkidle");
}

test("two quick-add photos appear in pending list and items list", async ({ page }) => {
  await denyGetUserMedia(page);
  await setupR2Mocks(page);

  await page.goto("/items/quick-add", { waitUntil: "networkidle" });
  await captureOneItem(page);
  await captureOneItem(page);

  // ── /items/pending shows pending items ────────────────────────────────────
  await page.goto("/items/pending");
  const pendingRows = page.locator("li.item-pending");
  await expect(pendingRows.first()).toBeVisible();
  expect(await pendingRows.count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator("text=(unbenannt)").first()).toBeVisible();

  // ── /items (main list) shows pending badge ────────────────────────────────
  await page.goto("/items");
  await expect(page.locator("span.badge-pending").first()).toBeVisible();
});
