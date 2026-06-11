/**
 * Diagnostic: inspect live KV state and verify writes persist within a session.
 */
import { expect, test, type Page } from "@playwright/test";

const USERNAME = process.env.PROD_USERNAME ?? "";
const PASSWORD = process.env.PROD_PASSWORD ?? "";

if (!USERNAME || !PASSWORD) {
  throw new Error("PROD_USERNAME and PROD_PASSWORD env vars are required");
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('[name="username"]', USERNAME);
  await page.fill('[name="password"]', PASSWORD);
  // Login form has only one submit — click within main to avoid nav logout button
  await page.locator("main").locator('[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test("kv: current state of categories and rooms", async ({ page }) => {
  await login(page);

  await page.goto("/categories");
  await expect(page).toHaveURL("/categories", { timeout: 10_000 });
  const catContent = await page.locator("main").textContent();
  console.log("\n=== /categories ===\n", catContent?.trim());

  await page.goto("/rooms");
  await expect(page).toHaveURL("/rooms", { timeout: 10_000 });
  const roomContent = await page.locator("main").textContent();
  console.log("\n=== /rooms ===\n", roomContent?.trim());
});

test("kv: write a category and verify it persists", async ({ page }) => {
  await login(page);

  await page.goto("/categories");
  await expect(page).toHaveURL("/categories", { timeout: 10_000 });

  const name = `diag-cat-${Date.now()}`;
  await page.fill('[name="name"]', name);
  // Click the submit inside the CREATE form (first form in main), not the nav logout
  await page.locator('main form:has([name="_action"][value="create"]) [type="submit"]').click();
  await expect(page).toHaveURL("/categories", { timeout: 10_000 });

  // Should be in the list now
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5_000 });
  console.log(`\nCategory "${name}" created and visible.`);

  // Navigate away and come back — verifies persistence within same session
  await page.goto("/items");
  await page.goto("/categories");
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5_000 });
  console.log(`Category "${name}" still visible after navigating away.`);

  // Clean up
  const deleteForm = page.locator(`li:has-text("${name}") form`);
  if (await deleteForm.isVisible()) {
    await deleteForm.locator('[type="submit"]').click();
    await page.waitForURL("/categories", { timeout: 5_000 });
    console.log(`Category "${name}" deleted.`);
  }
});

test("kv: write a room and verify it persists", async ({ page }) => {
  await login(page);

  await page.goto("/rooms");
  await expect(page).toHaveURL("/rooms", { timeout: 10_000 });

  const name = `diag-room-${Date.now()}`;
  await page.fill('[name="name"]', name);
  await page.locator('main form:has([name="_action"][value="create"]) [type="submit"]').click();
  await expect(page).toHaveURL("/rooms", { timeout: 10_000 });

  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5_000 });
  console.log(`\nRoom "${name}" created and visible.`);

  await page.goto("/items");
  await page.goto("/rooms");
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5_000 });
  console.log(`Room "${name}" still visible after navigating away.`);

  const deleteForm = page.locator(`li:has-text("${name}") form`);
  if (await deleteForm.isVisible()) {
    await deleteForm.locator('[type="submit"]').click();
    await page.waitForURL("/rooms", { timeout: 5_000 });
    console.log(`Room "${name}" deleted.`);
  }
});
