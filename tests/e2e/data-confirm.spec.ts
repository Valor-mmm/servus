/**
 * Verifies that the shared data-confirm mechanism intercepts destructive form
 * submits: accepting the dialog allows the action, dismissing it prevents it.
 */
import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

test("data-confirm: dismissing the dialog prevents a room deletion", async ({ page }) => {
  const roomName = `KeepMe-${RUN}`;

  // Create a room via UI
  await page.goto("/rooms");
  await page.fill('[name="name"]', roomName);
  await page.click('form [type="submit"]');
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`text=${roomName}`)).toBeVisible();

  // Dismiss the confirmation dialog — delete should be cancelled
  page.once("dialog", (dialog) => dialog.dismiss());
  const row = page.locator("li", { has: page.locator(`text=${roomName}`) });
  await row.locator('[type="submit"]').click();
  await page.waitForLoadState("networkidle");

  // Room must still be present
  await expect(page.locator(`text=${roomName}`)).toBeVisible();
});

test("data-confirm: accepting the dialog completes a room deletion", async ({ page }) => {
  const roomName = `DeleteMe-${RUN}`;

  // Create a room via UI
  await page.goto("/rooms");
  await page.fill('[name="name"]', roomName);
  await page.click('form [type="submit"]');
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`text=${roomName}`)).toBeVisible();

  // Accept the confirmation dialog — delete should proceed
  page.once("dialog", (dialog) => dialog.accept());
  const row = page.locator("li", { has: page.locator(`text=${roomName}`) });
  await row.locator('[type="submit"]').click();
  await page.waitForLoadState("networkidle");

  // Room must be gone
  await expect(page.locator(`text=${roomName}`)).toHaveCount(0);
});
