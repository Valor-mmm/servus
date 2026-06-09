import { expect, test } from "@playwright/test";

const ADMIN_USER = "testuser";
const ADMIN_PASS = "TestPw!1234";

const CREATE_BTN =
  'form:has([name="_action"][value="create_invite"]) button[type="submit"]';

test("full invite flow: admin mints code → helper confirms → helper lands on / authenticated → invite no longer listed", async ({ page }) => {
  // Step 1: Admin navigates to admin hub
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin");

  // Step 2: Admin creates an invite
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".invite-code-banner")).toBeVisible();
  const inviteUrl = (await page.locator(".invite-url").textContent())!.trim();
  expect(inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]{27,}/);

  // Step 3: Navigate directly to the invite URL (public route — no logout needed)
  await page.goto(inviteUrl);
  // Confirmation page: single button, no credential form
  await expect(page.locator("main button[type='submit']")).toBeVisible();
  await expect(page.locator('[name="username"]')).toHaveCount(0);
  await expect(page.locator('[name="password"]')).toHaveCount(0);

  // Step 4: Helper clicks confirm → redirected to / already authenticated
  await page.locator("main button[type='submit']").click();
  await page.waitForURL("/");

  // Step 5: Helper is authenticated (nav is visible)
  await expect(page.locator("nav.top-nav")).toBeVisible();

  // Step 6: Log out the helper session
  await page.locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // Step 7: Admin logs back in
  await page.fill('[name="username"]', ADMIN_USER);
  await page.fill('[name="password"]', ADMIN_PASS);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/");

  // Step 8: Consumed invite no longer appears in the admin list
  await page.goto("/admin");
  await expect(page.locator(".empty")).toBeVisible();
});

test("invite URL shows error after the code has been consumed", async ({ page }) => {
  // Create invite as admin
  await page.goto("/admin");
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  const inviteUrl = (await page.locator(".invite-url").textContent())!.trim();

  // Consume the invite
  await page.goto(inviteUrl);
  await page.locator("main button[type='submit']").click();
  await page.waitForURL("/");

  // Log out so we can test the invite URL again without being redirected by auth
  await page.locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // Try using the same invite URL again — should show invalid error
  await page.goto(inviteUrl);
  await expect(page.locator(".error")).toBeVisible();
});

test("invite banner shows a QR code image after minting", async ({ page }) => {
  await page.goto("/admin");
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".invite-code-banner")).toBeVisible();
  await expect(page.locator("img.invite-qr")).toBeVisible();
  const src = await page.locator("img.invite-qr").getAttribute("src");
  expect(src).toMatch(/^data:image\/svg\+xml/);

  // Clean up: revoke the created invite so subsequent tests start with empty list
  await page.locator("button.btn-danger").first().click();
  await page.waitForURL("/admin");
});

test("admin can revoke an invite before it is used", async ({ page }) => {
  // Create invite as admin
  await page.goto("/admin");
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  const inviteUrl = (await page.locator(".invite-url").textContent())!.trim();

  // Revoke the invite
  await page.locator("button.btn-danger").first().click();
  await page.waitForURL("/admin");

  // Invite list is now empty
  await expect(page.locator(".empty")).toBeVisible();

  // Trying to use the revoked invite URL shows an error
  await page.goto(inviteUrl);
  await expect(page.locator(".error")).toBeVisible();
});

test("/admin/invites redirects to /admin", async ({ page }) => {
  await page.goto("/admin/invites");
  await expect(page).toHaveURL("/admin");
});
