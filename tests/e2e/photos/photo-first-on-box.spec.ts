/**
 * Tasks 9.2 + 9.3: Photo-first capture from box detail.
 *
 * Mocking strategy:
 *   - page.route("/api/photos/upload-url") → returns a fixed key + upload URL
 *     so the PUT destination is predictable.
 *   - page.route("https://r2-e2e.example.com/**") → handles OPTIONS (CORS
 *     preflight) + PUT (upload) + GET (thumbnail) from the browser.
 *   - /api/items/create-from-photo → hits the real in-memory server.
 *
 * With R2_PUBLIC_URL_BASE=https://r2-e2e.example.com set in the test server
 * env, presignGet produces real thumbnail URLs pointing at that host.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.resolve("tests/e2e/fixtures/sample-item.jpg");
const R2_BASE = "https://r2-e2e.example.com";
const TEST_KEY = "e2e-test-photo-key-00000000000000000000000000000001";
const RUN = Date.now().toString(36);

async function createBox(
  page: import("@playwright/test").Page,
  label?: string,
) {
  await page.goto("/boxes");
  if (label) await page.fill('[name="label"]', label);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);
}

async function setupR2Mocks(page: import("@playwright/test").Page) {
  // Override the upload-url endpoint so the PUT target is our controlled URL
  await page.route("/api/photos/upload-url", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        key: TEST_KEY,
        url: `${R2_BASE}/${TEST_KEY}`,
      }),
    });
  });

  // Handle CORS preflight, PUT (upload), and GET (thumbnail display)
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
      // Serve the fixture JPEG so thumbnails actually load and are visible
      return route.fulfill({
        status: 200,
        contentType: "image/jpeg",
        path: FIXTURE,
      });
    }
    return route.fallback();
  });
}

// ── 9.2 + 9.3: photo-first item creation and subsequent name edit ─────────────

test("photo capture on box creates pending item; editing name keeps pending status", async ({ page }) => {
  const boxLabel = `PhotoBox-${RUN}`;

  await createBox(page, boxLabel);
  const boxUrl = page.url();

  // Wait for island JS to hydrate before registering mocks or setting files
  await page.waitForLoadState("networkidle");
  await setupR2Mocks(page);

  // Trigger photo capture by setting a file on the hidden input
  const fileInput = page.locator(".photo-capture input[type=file]");
  await fileInput.setInputFiles(FIXTURE);

  // Island processes, uploads, and reloads — wait for the pending item row
  await expect(
    page.locator("li.item-row"),
    "pending item row should appear after capture",
  ).toBeVisible({ timeout: 20_000 });

  // ── Assertions for task 9.2 ───────────────────────────────────────────────

  await expect(page.locator("text=(unbenannt)")).toBeVisible();
  await expect(page.locator("span.badge-pending").first()).toBeVisible();

  // Thumbnail src points to fake R2 endpoint (presignGet used TEST_KEY)
  const thumb = page.locator("img.item-thumbnail");
  await expect(thumb).toBeVisible();
  const src = await thumb.getAttribute("src");
  expect(src).toContain(R2_BASE);

  await expect(page.locator("dd", { hasText: "Gepackt" })).toBeVisible();

  // ── Assertions for task 9.3: edit name, pending badge persists ───────────

  await page.locator("a", { hasText: "(unbenannt)" }).click();
  await page.locator('a[href*="/edit"]').click();

  await page.fill('[name="name"]', "Bohrmaschine");
  // Use "Speichern" text to avoid clicking the photo-gallery "remove" button
  await page.locator("main button", { hasText: "Speichern" }).click();

  await expect(page.locator("h1", { hasText: "Bohrmaschine" })).toBeVisible();

  await page.goto(boxUrl);
  await expect(page.locator("text=Bohrmaschine")).toBeVisible();
  await expect(
    page.locator("span.badge-pending"),
    "pending badge must persist after name edit",
  ).toBeVisible();
});
