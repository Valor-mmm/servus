import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createRoom(page: import("@playwright/test").Page, name: string) {
  await page.goto("/rooms");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createItem(
  page: import("@playwright/test").Page,
  name: string,
  categoryLabel: string,
) {
  await page.goto("/items/new");
  await page.fill('[name="name"]', name);
  await page.selectOption('[name="categoryId"]', { label: categoryLabel });
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("admin page is accessible and shows all three sections", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("h1")).toContainText("Verwaltung");
  // Export section
  await expect(page.locator('a[href="/admin/export"]')).toBeVisible();
  // Import section
  await expect(page.locator('input[type="file"]')).toBeVisible();
  // Delete section — links to delete-confirm
  await expect(page.locator('a[href="/admin/delete-confirm"]')).toBeVisible();
});

test("export download contains NDJSON lines for created item", async ({ page }) => {
  const catName = `Kat-${RUN}`;
  const itemName = `Tisch-${RUN}`;

  await createCategory(page, catName);
  await createItem(page, itemName, catName);

  // Fetch export via API context (avoids needing to handle browser download)
  const response = await page.request.get("/admin/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("ndjson");
  expect(response.headers()["content-disposition"]).toContain("attachment");

  const body = await response.text();
  const lines = body.split("\n").filter((l) => l.trim());
  expect(lines.length).toBeGreaterThan(0);

  // At least one line should contain the item name
  const itemLine = lines.find((l) => {
    try {
      const parsed = JSON.parse(l);
      return parsed.key[0] === "item" &&
        parsed.value?.name === itemName;
    } catch {
      return false;
    }
  });
  expect(itemLine).toBeDefined();
});

test("delete-confirm page shows record count and cancel returns to admin", async ({ page }) => {
  await page.goto("/admin/delete-confirm");
  await expect(page.locator("h1")).toContainText("löschen");

  // Should show a count
  const body = page.locator("body");
  await expect(body).toContainText("Einträge");

  // Delete button should have a danger class (destructive styling)
  const deleteBtn = page.locator('button[type="submit"].btn-danger');
  await expect(deleteBtn).toBeVisible();

  // Cancel returns to /admin without deleting
  const cancelLink = page.locator('a.btn-secondary[href="/admin"]');
  await expect(cancelLink).toBeVisible();
  await cancelLink.click();
  await expect(page).toHaveURL("/admin");
});

test("full round-trip: export → delete-all → import restores data", async ({ page }) => {
  const catName = `RoundTrip-Kat-${RUN}`;
  const itemName = `RoundTrip-Sofa-${RUN}`;

  await createCategory(page, catName);
  await createItem(page, itemName, catName);

  // 1. Export
  const exportResponse = await page.request.get("/admin/export");
  expect(exportResponse.status()).toBe(200);
  const ndjsonContent = await exportResponse.text();
  expect(ndjsonContent.trim().length).toBeGreaterThan(0);

  // 2. Verify item exists before delete
  await page.goto("/items");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // 3. Delete all data
  await page.goto("/admin/delete-confirm");
  await page.click('button[type="submit"].btn-danger');
  await expect(page).toHaveURL(/\/admin\?deleted=/);

  // Success banner should show deleted count
  const deletedParam = new URL(page.url()).searchParams.get("deleted");
  expect(Number(deletedParam)).toBeGreaterThan(0);

  // 4. Item should now be gone
  await page.goto("/items");
  await expect(page.locator(`text=${itemName}`)).not.toBeVisible();

  // 5. Import the snapshot
  await page.goto("/admin");
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.ndjson",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(ndjsonContent, "utf-8"),
  });
  await page.click('form[action="/admin/import"] button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\?imported=/);

  // Success banner
  const importedParam = new URL(page.url()).searchParams.get("imported");
  expect(Number(importedParam)).toBeGreaterThan(0);

  // 6. Item should be visible again
  await page.goto("/items");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
});
