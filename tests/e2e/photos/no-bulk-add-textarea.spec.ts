/**
 * Task 9.6: Regression guard — the M3 bulk-add textarea must not exist on the
 * box detail page after the photo-first migration.
 */
import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

test("box detail page has no bulk-add textarea", async ({ page }) => {
  // Create a minimal box
  await page.goto("/boxes");
  await page.fill('[name="label"]', `Reg-${RUN}`);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL(/\/boxes\/.+/);

  // Textarea with name="names" must not exist
  await expect(page.locator('textarea[name="names"]')).toHaveCount(0);
  // A capture UI is present — either PhotoCapture fallback (.photo-capture) or
  // ContinuousCapture activation button (.capture-shutter), depending on
  // whether getUserMedia is available in the test environment.
  await expect(
    page.locator(".photo-capture, .capture-shutter"),
  ).toBeVisible();
});
