import { expect, test } from "@playwright/test";

// ── D1: Bottom nav on mobile, top nav on desktop ──────────────────────────────

test("bottom nav visible on mobile viewport, top nav hidden", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items");

  await expect(page.locator("nav.bottom-nav")).toBeVisible();
  await expect(page.locator("nav.top-nav")).not.toBeVisible();
});

test("top nav visible on desktop viewport, bottom nav hidden", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/items");

  await expect(page.locator("nav.top-nav")).toBeVisible();
  await expect(page.locator("nav.bottom-nav")).not.toBeVisible();
});

// ── D2: Status badges ─────────────────────────────────────────────────────────

test("packed box shows .badge-packed class", async ({ page }) => {
  const RUN = Date.now().toString(36);

  // Create a box and add an item to make it packed
  await page.goto("/boxes");
  await page.fill('[name="label"]', `Badge-Test-${RUN}`);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);

  await page.fill('[name="names"]', `Item-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

  await expect(page.locator(".badge-packed")).toBeVisible();
});

test("delivered box shows .badge-delivered class", async ({ page }) => {
  const RUN = Date.now().toString(36);

  await page.goto("/boxes");
  await page.fill('[name="label"]', `Delivered-Badge-${RUN}`);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);

  await page.fill('[name="names"]', `Item-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

  await page.locator("button", { hasText: "Als geliefert markieren" }).click();

  await expect(page.locator(".badge-delivered")).toBeVisible();
});

// ── D3: Lion SVG asset ────────────────────────────────────────────────────────

test("GET /lion.svg returns 200 with SVG content-type", async ({ page }) => {
  const response = await page.request.get("/lion.svg");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("svg");
});

// ── D4: PWA manifest link ─────────────────────────────────────────────────────

test("authenticated page has manifest link in head", async ({ page }) => {
  await page.goto("/items");
  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute("href", "/manifest.json");
});

test("GET /manifest.json returns valid JSON with required fields", async ({ page }) => {
  const response = await page.request.get("/manifest.json");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("name");
  expect(body).toHaveProperty("short_name");
  expect(body).toHaveProperty("display", "standalone");
  expect(body).toHaveProperty("theme_color");
  expect(body).toHaveProperty("icons");
});

// ── D5: Confetti script on delivered box page ─────────────────────────────────

test("box detail page with ?delivered=1 includes confetti script tag", async ({ page }) => {
  const RUN = Date.now().toString(36);

  await page.goto("/boxes");
  await page.fill('[name="label"]', `Confetti-${RUN}`);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);

  await page.fill('[name="names"]', `Item-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

  await page.locator("button", { hasText: "Als geliefert markieren" }).click();

  // Should be redirected to ?delivered=1
  await expect(page).toHaveURL(/\?delivered=1/);

  // confetti.js script tag should be present
  const scriptTag = page.locator('script[src="/confetti.js"]');
  await expect(scriptTag).toHaveCount(1);
});
