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

  // Step 3: Log out so the invite URL can be consumed as a new (unauthenticated) user
  await page.locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // Step 4: Navigate to invite URL as unauthenticated user
  await page.goto(inviteUrl);
  // Confirmation page: single button, no credential form
  await expect(page.locator("main button[type='submit']")).toBeVisible();
  await expect(page.locator('[name="username"]')).toHaveCount(0);
  await expect(page.locator('[name="password"]')).toHaveCount(0);

  // Step 5: Helper clicks confirm → redirected to / already authenticated
  await page.locator("main button[type='submit']").click();
  await page.waitForURL("/");

  // Step 6: Helper is authenticated (nav is visible)
  await expect(page.locator("nav.top-nav")).toBeVisible();

  // Step 7: Log out the helper session
  await page.locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // Step 8: Admin logs back in
  await page.fill('[name="username"]', ADMIN_USER);
  await page.fill('[name="password"]', ADMIN_PASS);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/");

  // Step 9: Consumed invite no longer appears in the admin list
  await page.goto("/admin");
  await expect(page.locator(".empty-state")).toBeVisible();

  // Persist the fresh admin session so subsequent tests don't start with an
  // invalidated cookie (the original session was destroyed by the logout above).
  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
});

test("invite URL shows error after the code has been consumed", async ({ page }) => {
  // Create invite as admin
  await page.goto("/admin");
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  const inviteUrl = (await page.locator(".invite-url").textContent())!.trim();

  // Log out so we can consume the invite as an unauthenticated user
  await page.locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // Consume the invite as unauthenticated user
  await page.goto(inviteUrl);
  await page.locator("main button[type='submit']").click();
  await page.waitForURL("/");

  // Log out the helper session
  await page.locator('nav.top-nav form[action="/logout"] button[type="submit"]')
    .click();
  await page.waitForURL(/\/login/);

  // Try using the same invite URL again — should show invalid error
  await page.goto(inviteUrl);
  await expect(page.locator(".error")).toBeVisible();

  // Re-login as admin and persist the fresh session so subsequent tests
  // don't start with the now-invalidated session cookie from user.json.
  await page.goto("/login");
  await page.fill('[name="username"]', ADMIN_USER);
  await page.fill('[name="password"]', ADMIN_PASS);
  await page.click('[type="submit"]');
  await page.waitForURL("/");
  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
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
  page.once("dialog", (d) => d.accept());
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
  page.once("dialog", (d) => d.accept());
  await page.locator("button.btn-danger").first().click();
  await page.waitForURL("/admin");

  // Invite list is now empty
  await expect(page.locator(".empty-state")).toBeVisible();

  // Trying to use the revoked invite URL shows an error
  await page.goto(inviteUrl);
  await expect(page.locator(".error")).toBeVisible();
});

test("/admin/invites redirects to /admin", async ({ page }) => {
  await page.goto("/admin/invites");
  await expect(page).toHaveURL("/admin");
});

test("logged-in user visiting invite URL sees already-logged-in message, not consume form", async ({ page }) => {
  // Create an invite (as the pre-authenticated admin)
  await page.goto("/admin");
  await page.locator(CREATE_BTN).click();
  await page.waitForLoadState("networkidle");
  const inviteUrl = (await page.locator(".invite-url").textContent())!.trim();

  // Visit the invite URL while still logged in
  await page.goto(inviteUrl);

  // Must NOT show a consume button
  await expect(page.locator("main button[type='submit']")).toHaveCount(0);
  // Must show the already-logged-in error
  await expect(page.locator(".error")).toBeVisible();

  // Clean up — go back and revoke
  await page.goto("/admin");
  page.once("dialog", (d) => d.accept());
  await page.locator("button.btn-danger").first().click();
  await page.waitForURL("/admin");
});
