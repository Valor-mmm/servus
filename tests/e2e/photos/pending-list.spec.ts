/**
 * Task 9.4: Two photo-first items appear in /items/incomplete and /items with
 * the incomplete badge.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

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
  const fileInput = page.locator(".photo-capture input[type=file][capture]");
  await fileInput.setInputFiles(FIXTURE);
  // Once the upload completes, the island shows a "Fertig" action.
  // Tap it to commit and let the page reload.
  await expect(page.locator("button", { hasText: "Fertig" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("button", { hasText: "Fertig" }).click();
  await page.waitForLoadState("networkidle");
}

test("two quick-add photos appear in incomplete triage and items list", async ({ page }) => {
  await setupR2Mocks(page);

  await page.goto("/items/quick-add", { waitUntil: "networkidle" });
  await captureOneItem(page);
  await captureOneItem(page);

  // ── /items/incomplete shows triage with at least 2 items ─────────────────
  await page.goto("/items/incomplete");
  // Triage shows one item at a time; position indicator shows "N von M"
  await expect(page.locator(".triage-index")).toBeVisible();
  const indexText = await page.locator(".triage-index").innerText();
  // Extract M from "N von M"
  const mMatch = indexText.match(/von\s+(\d+)/);
  const m = mMatch ? parseInt(mMatch[1], 10) : 0;
  expect(m, `triage shows "${indexText}" — M should be >= 2`)
    .toBeGreaterThanOrEqual(2);
  // Placeholder name shown for unnamed items
  await expect(
    page.locator("h2.triage-item-name", { hasText: "(unbenannt)" }),
  ).toBeVisible();

  // ── /items (main list) shows incomplete badge ─────────────────────────────
  await page.goto("/items");
  await expect(page.locator("span.badge-incomplete").first()).toBeVisible();
});
