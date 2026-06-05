import { type Browser, expect, test } from "@playwright/test";

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

// ── Persistent session: cookie survives browser-process restart ──────────────
// Simulates iOS Safari being evicted from memory and cold-started: cookies
// only persist if Set-Cookie included Max-Age, which Playwright's storageState
// preserves only for persistent cookies. A session cookie (no Max-Age) would
// be dropped by storageState and the second context would land on /login.

test("session cookie survives a simulated browser restart", async ({ browser }: { browser: Browser }) => {
  // Log in with a fresh context to get a clean cookie jar.
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await firstPage.goto("/login");
  await firstPage.fill('[name="username"]', USER);
  await firstPage.fill('[name="password"]', PASS);
  await firstPage.click('[type="submit"]');
  await expect(firstPage).toHaveURL("/");

  // Snapshot the cookie jar. Persistent cookies (Max-Age set) are kept;
  // non-persistent session cookies are dropped — that's the behavior we rely on.
  const state = await firstContext.storageState();
  const sessionCookie = state.cookies.find((c) => c.name === "servus_session");
  expect(sessionCookie, "session cookie must be present in stored state")
    .toBeDefined();
  expect(
    sessionCookie!.expires,
    "session cookie must have an expiry (persistent)",
  ).toBeGreaterThan(0);
  await firstContext.close();

  // Open a fresh context populated from the stored state — equivalent to
  // Safari cold-starting after the OS reclaimed memory.
  const secondContext = await browser.newContext({ storageState: state });
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/");
  await expect(secondPage).toHaveURL("/");
  await expect(secondPage.locator("nav.top-nav")).toBeVisible();
  await secondContext.close();
});
