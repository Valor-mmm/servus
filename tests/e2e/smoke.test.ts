import { expect, test } from "@playwright/test";

test("homepage loads and shows app name in title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("servus");
  // Dashboard shows Erfassen CTA button
  await expect(page.locator("a.btn-primary")).toBeVisible();
});

test("healthz returns ok", async ({ request }) => {
  const response = await request.get("/healthz");
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("ok");
});
