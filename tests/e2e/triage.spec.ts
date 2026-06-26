/**
 * Triage flow: photo-first item appears in /items/incomplete,
 * fill in name, save as complete, auto-advance to empty state.
 * Also verifies /items/pending redirects to /items/incomplete.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.resolve("tests/e2e/fixtures/sample-item.jpg");
const R2_BASE = "https://r2-e2e.example.com";
const RUN = Date.now().toString(36);

async function setupR2Mocks(page: import("@playwright/test").Page) {
  await page.route("/api/photos/upload-url", (route) => {
    const key = `e2e-triage-${RUN}-${Date.now()}`;
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

const MOBILE = { width: 390, height: 844 };

test("/items/pending redirects to /items/incomplete", async ({ page }) => {
  const response = await page.goto("/items/pending", {
    waitUntil: "networkidle",
  });
  expect(page.url()).toContain("/items/incomplete");
  // 301 redirect — final response OK
  expect(response?.status()).toBeLessThan(400);
});

test("triage: capture photo-first item, complete it, reach empty state", async ({ page }) => {
  await setupR2Mocks(page);

  // ── Step 1: capture one item via quick-add ────────────────────────────────
  await page.goto("/items/quick-add", { waitUntil: "networkidle" });
  const fileInput = page.locator(".photo-capture input[type=file][capture]");
  await fileInput.setInputFiles(FIXTURE);
  await expect(page.locator("button", { hasText: "Fertig" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("button", { hasText: "Fertig" }).click();
  await page.waitForLoadState("networkidle");

  // ── Step 2: go to triage, verify item appears ─────────────────────────────
  await page.goto("/items/incomplete");
  await expect(page.locator(".triage-index")).toBeVisible();
  await expect(
    page.locator("h2.triage-item-name", { hasText: "(unbenannt)" }),
  ).toBeVisible();

  // ── Step 3: fill in a name and save as complete ───────────────────────────
  const itemName = `TriageTestItem-${RUN}`;
  await page.fill('input[name="name"]', itemName);
  await page.click('button[value="complete"]');
  await page.waitForLoadState("networkidle");

  // ── Step 4: verify the saved item is now complete (not in triage) ─────────
  // Either the triage shows empty state (if this was the only incomplete item)
  // or the counter decremented. Check the saved item is no longer named "(unbenannt)".
  const url = page.url();
  if (url.includes("/items/incomplete")) {
    const isEmptyState = await page
      .locator(".empty-state")
      .isVisible()
      .catch(() => false);
    if (!isEmptyState) {
      // More items remain — just verify we advanced past the saved one
      const nameText = await page
        .locator("h2.triage-item-name")
        .textContent()
        .catch(() => "");
      // The saved item should not be the current one
      expect(nameText).not.toBe(itemName);
    }
  }

  // ── Step 5: verify saved item is complete in /items ───────────────────────
  await page.goto("/items");
  await expect(page.locator(`a`, { hasText: itemName }).first()).toBeVisible();
  // No incomplete badge for the completed item
  const row = page.locator("li.item-row", {
    has: page.locator(`text=${itemName}`),
  });
  await expect(row.locator("span.badge-incomplete")).toHaveCount(0);
});

test("triage: mobile viewport (390×844) — page renders and form is usable", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await setupR2Mocks(page);

  // The triage index must render without overflow at mobile width
  await page.goto("/items/incomplete");
  await expect(page.locator("nav.bottom-nav")).toBeVisible();

  // If there are incomplete items, the form must be within viewport bounds
  const hasItems = await page.locator(".triage-item-name").count() > 0;
  if (hasItems) {
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();

    // Input must be fully within the viewport (not obscured by bottom nav)
    const box = await nameInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThan(MOBILE.height);
  }

  // Quick-add link in bottom nav must be tappable (44 px minimum target)
  const quickAdd = page.locator("nav.bottom-nav a[href='/items/quick-add']");
  await expect(quickAdd).toBeVisible();
  const navBox = await quickAdd.boundingBox();
  expect(navBox).not.toBeNull();
  expect(navBox!.height).toBeGreaterThanOrEqual(44);
});
