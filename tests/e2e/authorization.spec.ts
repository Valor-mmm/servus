import { expect, test } from "@playwright/test";

const ADMIN_USER = "testuser";
const ADMIN_PASS = "TestPw!1234";

const CREATE_BTN =
  'form:has([name="_action"][value="create_invite"]) button[type="submit"]';

/**
 * Authorization E2E: role-based access control.
 *
 * Tests run as the pre-authenticated admin (testuser, role:admin). The test:
 *   1. Verifies admin sees the "Verwaltung" link and /admin loads.
 *   2. Creates an invite → helper logs in via invite.
 *   3. Verifies helper does NOT see the "Verwaltung" link.
 *   4. Verifies helper gets 403 on direct navigation to /admin.
 *   5. Logs out helper → logs back in as admin → verifies admin still works.
 */
test("admin sees Verwaltung link and /admin loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('nav.top-nav a[href="/admin"]')).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL("/admin");
  // Page should render the admin hub, not a 403
  await expect(page.locator("h1")).not.toContainText("403");
});

test("helper (role:user) does not see Verwaltung link and gets 403 on /admin", async ({ page }) => {
  // --- Admin creates invite ---
  await page.goto("/admin");
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  const inviteUrl = (await page.locator(".invite-url").textContent())!.trim();
  expect(inviteUrl).toMatch(/\/invite\//);

  // --- Navigate to invite URL (public route; confirms creates a HELPER session
  //     that replaces the browser cookie without invalidating the admin KV session) ---
  await page.goto(inviteUrl);
  await expect(page.locator("main button[type='submit']")).toBeVisible();
  await page.locator("main button[type='submit']").click();
  await page.waitForURL("/");

  // --- Helper is authenticated: nav visible but no Verwaltung link ---
  await expect(page.locator("nav.top-nav")).toBeVisible();
  await expect(page.locator('nav.top-nav a[href="/admin"]')).toHaveCount(0);

  // --- Helper navigates directly to /admin → 403 ---
  await page.goto("/admin");
  // Page should show 403 content, not the admin hub
  const bodyText = await page.locator("body").textContent();
  expect(bodyText).toContain("403");

  // --- Log out helper (navigate to /items first — 403 page has no nav) ---
  await page.goto("/items");
  await page
    .locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // --- Admin logs back in and verifies full access ---
  await page.fill('[name="username"]', ADMIN_USER);
  await page.fill('[name="password"]', ADMIN_PASS);
  await page.click('[type="submit"]');
  await page.waitForURL("/");

  await expect(page.locator('nav.top-nav a[href="/admin"]')).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin");
  await expect(page.locator("h1")).not.toContainText("403");
});
