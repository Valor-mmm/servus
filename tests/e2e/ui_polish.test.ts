import { expect, test } from "@playwright/test";

// ── Dark mode toggle ──────────────────────────────────────────────────────────

test("dark mode toggle on desktop applies html.dark and persists on reload", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/items");

  // Ensure we start in light mode
  await page.evaluate(() => {
    localStorage.removeItem("servus-theme");
    document.documentElement.classList.remove("dark");
  });
  await page.reload();

  const html = page.locator("html");
  const toggleBtn = page.locator("nav.top-nav [data-theme-toggle]");

  await expect(html).not.toHaveClass(/dark/);

  await toggleBtn.click();
  await expect(html).toHaveClass(/dark/);

  const stored = await page.evaluate(() =>
    localStorage.getItem("servus-theme")
  );
  expect(stored).toBe("dark");

  // Persists after reload
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Restore light mode for other tests
  await page.evaluate(() => localStorage.removeItem("servus-theme"));
});

test("dark mode FAB on mobile applies html.dark", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items");

  await page.evaluate(() => {
    localStorage.removeItem("servus-theme");
    document.documentElement.classList.remove("dark");
  });
  await page.reload();

  const fab = page.locator("button.theme-toggle-fab");
  await expect(fab).toBeVisible();
  await fab.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

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
