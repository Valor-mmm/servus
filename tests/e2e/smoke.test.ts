import { expect, test } from "@playwright/test";

test("homepage loads and shows app name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("servus");
  await expect(page.locator("h1")).toContainText("servus");
});

test("healthz returns ok", async ({ request }) => {
  const response = await request.get("/healthz");
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("ok");
});
