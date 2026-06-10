import { expect, test } from "@playwright/test";

// ── PWA: manifest and offline fallback ───────────────────────────────────────

test("manifest link is present in HTML head", async ({ page }) => {
  await page.goto("/items");
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute("href", "/manifest.json");
});

test("manifest.json contains PNG and SVG icon entries", async ({ page }) => {
  const response = await page.request.get("/manifest.json");
  expect(response.ok()).toBe(true);

  const json = await response.json();
  expect(json.icons).toHaveLength(4);

  const png192 = json.icons.find(
    (i: { type: string; sizes: string }) =>
      i.type === "image/png" && i.sizes === "192x192",
  );
  expect(png192).toBeDefined();
  expect(png192.src).toBe("/icon-192.png");
  expect(png192.purpose).toBe("any");

  const png512 = json.icons.find(
    (i: { type: string; sizes: string }) =>
      i.type === "image/png" && i.sizes === "512x512",
  );
  expect(png512).toBeDefined();
  expect(png512.src).toBe("/icon-512.png");
  expect(png512.purpose).toContain("maskable");

  const svgAny = json.icons.find(
    (i: { src: string }) => i.src === "/lion.svg",
  );
  expect(svgAny).toBeDefined();

  const svgMaskable = json.icons.find(
    (i: { src: string }) => i.src === "/lion-maskable.svg",
  );
  expect(svgMaskable).toBeDefined();
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
