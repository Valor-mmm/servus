import { expect, test } from "@playwright/test";

// ── PWA: manifest and offline fallback ───────────────────────────────────────

test("manifest link is present in HTML head", async ({ page }) => {
  await page.goto("/items");
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute("href", "/manifest.json");
});

test("manifest.json contains both SVG icon entries", async ({ page }) => {
  const response = await page.request.get("/manifest.json");
  expect(response.ok()).toBe(true);

  const json = await response.json();
  expect(json.icons).toHaveLength(2);

  const anyIcon = json.icons.find(
    (i: { purpose: string }) => i.purpose === "any",
  );
  expect(anyIcon).toBeDefined();
  expect(anyIcon.src).toBe("/lion.svg");
  expect(anyIcon.type).toBe("image/svg+xml");

  const maskableIcon = json.icons.find(
    (i: { purpose: string }) => i.purpose === "maskable",
  );
  expect(maskableIcon).toBeDefined();
  expect(maskableIcon.src).toBe("/lion-maskable.svg");
  expect(maskableIcon.type).toBe("image/svg+xml");
});

test("offline page is served when navigation fails with no network", async ({ page, context }) => {
  // Load the page first so the service worker can install and cache the shell.
  await page.goto("/items");

  // Give the service worker time to finish the install event and cache the
  // app shell (including offline.html).
  await page.waitForTimeout(1500);

  // Cut the network.
  await context.setOffline(true);

  // Navigate to a new page — the SW intercepts, network fails, returns offline.html.
  const response = await page.goto("/boxes");
  const body = await response!.text();
  expect(body).toContain("Koa Netz");

  // Restore network so other tests are not affected.
  await context.setOffline(false);
});
