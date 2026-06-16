import { expect, test } from "@playwright/test";

const USER = "testuser";
const PASS = "TestPw!1234";

test("mobile bottom bar shows primary entries + Mehr; Mehr holds secondary links and logout", async ({ page }) => {
  // Narrow viewport so the bottom nav (hidden ≥768px) is shown.
  await page.setViewportSize({ width: 390, height: 844 });

  // Log in with a fresh session so the logout below does not invalidate the
  // shared storage-state session other tests rely on.
  await page.goto("/login");
  await page.fill('[name="username"]', USER);
  await page.fill('[name="password"]', PASS);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/");

  await page.goto("/items");

  // Bottom bar: the four primary entries are present...
  const bar = page.locator("nav.bottom-nav");
  await expect(bar.locator('a[href="/items"]')).toBeVisible();
  await expect(bar.locator('a[href="/boxes"]')).toBeVisible();
  await expect(bar.locator('a[href="/items/quick-add"]')).toBeVisible();
  await expect(bar.locator('a[href="/mehr"]')).toBeVisible();
  // ...and the secondary destinations are NOT in the bar.
  await expect(bar.locator('a[href="/categories"]')).toHaveCount(0);
  await expect(bar.locator('a[href="/rooms"]')).toHaveCount(0);

  // Open the Mehr menu.
  await bar.locator('a[href="/mehr"]').click();
  await expect(page).toHaveURL("/mehr");
  const menu = page.locator(".menu-list");
  await expect(menu.locator('a[href="/categories"]')).toBeVisible();
  await expect(menu.locator('a[href="/rooms"]')).toBeVisible();
  await expect(menu.locator('a[href="/admin"]')).toBeVisible();

  // Logout from the Mehr page returns to the login screen.
  await menu.locator('form[action="/logout"] button[type="submit"]').click();
  await page.waitForURL(/\/login/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
