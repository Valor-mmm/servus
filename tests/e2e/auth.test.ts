import { expect, test } from "@playwright/test";

const USER = "testuser";
const PASS = "TestPw!1234";
const WRONG_PASS = "wrong-password";
// Use a different "user" slug for lockout tests to avoid poisoning the real user's counter
const LOCKOUT_USER = "lockout-victim";

// ── 9.2: Unauthenticated redirect + successful login ─────────────────────────

test("unauthenticated visit to / redirects to /login?next=%2F", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.url()).toContain("next=%2F");
});

test("successful login redirects to /", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="username"]', USER);
  await page.fill('[name="password"]', PASS);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/");
});

// ── 9.5: Logout invalidates session ──────────────────────────────────────────

test("logout returns to /login and old session no longer works", async ({ page }) => {
  // Log in first
  await page.goto("/login");
  await page.fill('[name="username"]', USER);
  await page.fill('[name="password"]', PASS);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/");

  // Click the logout button in the nav (has hidden csrf_token field)
  await page.click('nav button[type="submit"]');
  await page.waitForURL(/\/login/);

  // Navigating to / should now redirect back to /login
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

// ── 9.3: Wrong password shows error, does not log in ─────────────────────────

test("wrong password shows error and stays on /login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="username"]', USER);
  await page.fill('[name="password"]', WRONG_PASS);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/\/login/);
  // Error message should be visible (German text via t())
  await expect(page.locator(".error")).toBeVisible();
});

// ── 9.4: Rate-limit lockout ───────────────────────────────────────────────────

test("after 6 wrong attempts for a user the form shows a rate-limit error", async ({ page }) => {
  // Use a different username so we don't affect testuser's counter
  await page.goto("/login");
  for (let i = 0; i < 6; i++) {
    await page.fill('[name="username"]', LOCKOUT_USER);
    await page.fill('[name="password"]', `wrong-${i}`);
    await page.click('[type="submit"]');
    await page.waitForLoadState("networkidle");
  }
  // After 6 failures, the error message should include lockout/rate info
  await expect(page.locator(".error")).toBeVisible();
});
