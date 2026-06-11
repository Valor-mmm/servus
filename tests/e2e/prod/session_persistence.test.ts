/**
 * Production session-persistence tests.
 *
 * These run against the live deployment at https://servus.valor.codes.
 * They reproduce the iOS-PWA session-drop bug and verify data persists
 * across session expiry.
 *
 * Run with:
 *   PROD_USERNAME=monster PROD_PASSWORD=<pw> \
 *     node_modules/.bin/playwright test --config=playwright.prod.config.ts
 */
import { expect, test, type Page } from "@playwright/test";

const USERNAME = process.env.PROD_USERNAME ?? "";
const PASSWORD = process.env.PROD_PASSWORD ?? "";

if (!USERNAME || !PASSWORD) {
  throw new Error("PROD_USERNAME and PROD_PASSWORD env vars are required");
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('[name="username"]', USERNAME);
  await page.fill('[name="password"]', PASSWORD);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 10_000 });
}

// ── Bug repro: SameSite=Strict drops session on cross-origin navigation ───────
//
// iOS PWA: when the OS kills the WKWebView and the user reopens the icon, the
// first navigation is treated as cross-origin. SameSite=Strict blocks the
// cookie → immediate redirect to /login, which LOOKS like "all data gone".
// SameSite=Lax sends the cookie on top-level GET navigations from any origin,
// so session survives.
//
// Playwright simulation: log in, navigate away to a cross-origin URL, navigate
// back. With SameSite=Strict this redirects to /login. With SameSite=Lax the
// app loads authenticated.

test("session survives a cross-origin navigation (iOS PWA cold-open simulation)", async ({
  page,
}) => {
  await login(page);

  // Confirm we're authenticated — /items should load
  await page.goto("/items");
  await expect(page).toHaveURL("/items", { timeout: 10_000 });
  await expect(page.locator("main")).toBeVisible();

  // Navigate to a completely external domain (simulates leaving the PWA context)
  await page.goto("https://example.com");
  await expect(page).toHaveURL("https://example.com");

  // Navigate back — this is the iOS cold-open equivalent
  await page.goto("https://servus.valor.codes/items");

  // With SameSite=Lax: still authenticated, /items loads
  // With SameSite=Strict: redirected to /login (bug)
  await expect(page).toHaveURL("https://servus.valor.codes/items", {
    timeout: 10_000,
  });
  await expect(page.locator("main")).toBeVisible();
  // Should NOT have been redirected to login
  await expect(page).not.toHaveURL(/\/login/);
});

// ── Data persistence: items survive session expiry + re-login ─────────────────
//
// Proves that "data loss" is/was not real KV deletion — items are present
// after a forced logout and re-login. If this test fails, data genuinely
// disappeared from KV.

test("items persist after session is cleared and user re-logs in", async ({
  page,
  context,
}) => {
  await login(page);

  // Snapshot existing items before cookie-clearing
  await page.goto("/items?all=1");
  await expect(page).toHaveURL(/\/items/, { timeout: 10_000 });
  const itemLinks = page.locator(".item-list a");
  const initialCount = await itemLinks.count();
  // Grab the first item's text as a stable reference (skip if list is empty)
  const firstItemText = initialCount > 0
    ? await itemLinks.first().textContent()
    : null;

  // Force-expire the session by deleting all cookies (simulates session drop / iOS PWA cold-start)
  await context.clearCookies();

  // Navigate to /items — must redirect to /login
  await page.goto("/items");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  // Re-login — the login handler follows the `next` query param (e.g. back to /items),
  // so we don't assert a specific URL, only that we're no longer on /login.
  await page.fill('[name="username"]', USERNAME);
  await page.fill('[name="password"]', PASSWORD);
  await page.click('[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

  // Items must still be there — data was never lost
  await page.goto("/items?all=1");
  await expect(page).toHaveURL(/\/items/, { timeout: 10_000 });
  const afterCount = await page.locator(".item-list a").count();
  expect(afterCount).toBe(initialCount);

  if (firstItemText) {
    await expect(
      page.locator(`.item-list a:has-text("${firstItemText}")`).first(),
    ).toBeVisible({ timeout: 5_000 });
  }
});

// ── Diagnostic: item creation form submission ─────────────────────────────────
//
// Diagnoses whether form submission on /items/new works in production.
// Selects the first available category from the dropdown.

test("item creation works end-to-end when a category exists", async ({
  page,
}) => {
  await login(page);

  await page.goto("/items/new");
  await expect(page).toHaveURL("/items/new", { timeout: 10_000 });

  // Check if any categories are available
  const categoryOptions = page.locator('select[name="categoryId"] option[value]:not([value=""])');
  const catCount = await categoryOptions.count();

  if (catCount === 0) {
    // No categories — skip (test is a no-op, not a failure)
    console.log("No categories found in production, skipping item creation test");
    return;
  }

  // Select the first real category
  const firstCatValue = await categoryOptions.first().getAttribute("value");
  await page.selectOption('select[name="categoryId"]', firstCatValue!);

  const marker = `prod-test-${Date.now()}`;
  await page.fill('[name="name"]', marker);

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/items", { timeout: 10_000 });
  await expect(page.locator(`text=${marker}`)).toBeVisible({ timeout: 5_000 });

  // Clean up: navigate to the item and delete it
  const itemLink = page.locator(`a:has-text("${marker}")`).first();
  const href = await itemLink.getAttribute("href");
  if (href) {
    await page.goto(`${href}`);
    // Look for a delete button or edit link
    const editLink = page.locator('a[href*="/edit"]').first();
    if (await editLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await editLink.click();
      const deleteBtn = page.locator('button[formaction*="delete"], button:has-text("Löschen")').first();
      if (await deleteBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await deleteBtn.click();
      }
    }
  }
});

// ── Session idle: navigating within the app keeps session alive ───────────────
//
// Verifies that normal in-app navigation does not drop the session.

test("session stays alive through multiple in-app navigations", async ({
  page,
}) => {
  await login(page);

  const paths = ["/items", "/categories", "/rooms", "/items"];
  for (const path of paths) {
    await page.goto(path);
    await expect(page).toHaveURL(path, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("main")).toBeVisible();
  }
});
