import { expect, test } from "@playwright/test";

// ── Theme switcher (Raute light ↔ Sternenhimmel dark) ─────────────────────────

test("desktop toggle swaps theme-raute ↔ theme-sternenhimmel and persists", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/items");

  // Start clean, force light theme.
  await page.evaluate(() => {
    localStorage.setItem("servus-theme", "raute");
  });
  await page.reload();

  const html = page.locator("html");
  const toggleBtn = page.locator("nav.top-nav [data-theme-toggle]");

  await expect(html).toHaveClass(/theme-raute/);
  await expect(html).not.toHaveClass(/theme-sternenhimmel/);

  await toggleBtn.click();
  await expect(html).toHaveClass(/theme-sternenhimmel/);
  await expect(html).not.toHaveClass(/theme-raute/);

  const stored = await page.evaluate(() =>
    localStorage.getItem("servus-theme")
  );
  expect(stored).toBe("sternenhimmel");

  // Persists after reload (no flash should be visible).
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/theme-sternenhimmel/);

  // <meta name="theme-color"> tracks the active theme.
  const color = await page.locator('meta[name="theme-color"]').getAttribute(
    "content",
  );
  expect(color).toBe("#0E1830");

  await page.evaluate(() => localStorage.removeItem("servus-theme"));
});

test("mobile FAB swaps theme-raute → theme-sternenhimmel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items");

  await page.evaluate(() => {
    localStorage.setItem("servus-theme", "raute");
  });
  await page.reload();

  const fab = page.locator("button.theme-toggle-fab");
  await expect(fab).toBeVisible();
  await fab.click();
  await expect(page.locator("html")).toHaveClass(/theme-sternenhimmel/);

  await page.evaluate(() => localStorage.removeItem("servus-theme"));
});

test("invalid stored theme value falls through to default", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/items");

  // Legacy values from before the rename must not break anything.
  await page.evaluate(() => {
    localStorage.setItem("servus-theme", "dark");
  });
  await page.reload();

  // The pre-paint script falls back to system preference; in headless
  // Chrome that resolves to Raute (light).
  const html = page.locator("html");
  await expect(html).toHaveClass(/theme-(raute|sternenhimmel)/);
  await expect(html).not.toHaveClass(/^dark$/);

  await page.evaluate(() => localStorage.removeItem("servus-theme"));
});

// ── Active nav state ──────────────────────────────────────────────────────────

test("top-nav active link has nav-active class on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/items");

  const itemsLink = page.locator("nav.top-nav a[href='/items']:not(.nav-logo)");
  await expect(itemsLink).toHaveClass(/nav-active/);

  const boxesLink = page.locator("nav.top-nav a[href='/boxes']");
  await expect(boxesLink).not.toHaveClass(/nav-active/);
});

test("bottom-nav active link has nav-active class on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items");

  const itemsLink = page.locator("nav.bottom-nav a[href='/items']");
  await expect(itemsLink).toHaveClass(/nav-active/);
});

// ── Lazy thumbnail loading ────────────────────────────────────────────────────

test("item-thumbnail images use data-src not src on initial load", async ({ page }) => {
  await page.goto("/items");

  // If there are any thumbnail images they must use data-src, not src
  const thumbnails = page.locator("img.item-thumbnail");
  const count = await thumbnails.count();

  for (let i = 0; i < count; i++) {
    const img = thumbnails.nth(i);
    await expect(img).toHaveAttribute("data-src");
    // src should NOT be set eagerly — it may be empty string or absent
    const src = await img.getAttribute("src");
    expect(src == null || src === "").toBeTruthy();
  }
});

// ── Login page centering ──────────────────────────────────────────────────────

test("login page uses auth-page class for centered layout", async ({ page, context }) => {
  // Log out first so we hit the unauthenticated login page
  await context.clearCookies();
  await page.goto("/login");

  await expect(page.locator(".auth-page")).toBeVisible();
});

// ── Static assets ─────────────────────────────────────────────────────────────

test("theme-init.js and app-init.js are served as static assets", async ({ page }) => {
  const themeRes = await page.request.get("/theme-init.js");
  expect(themeRes.status()).toBe(200);
  expect(themeRes.headers()["content-type"]).toMatch(/javascript/);

  const appRes = await page.request.get("/app-init.js");
  expect(appRes.status()).toBe(200);
  expect(appRes.headers()["content-type"]).toMatch(/javascript/);
});

test("_app.tsx head includes theme-init.js script before stylesheet", async ({ page }) => {
  const html = await page.goto("/items").then(() => page.content());

  const themeScriptPos = html.indexOf("/theme-init.js");
  const stylesheetPos = html.indexOf("/styles.css");

  expect(themeScriptPos).toBeGreaterThan(-1);
  expect(stylesheetPos).toBeGreaterThan(-1);
  // Anti-flash: theme init must come before the stylesheet
  expect(themeScriptPos).toBeLessThan(stylesheetPos);
});
