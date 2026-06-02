/**
 * E2E tests for the ContinuousCapture island (WebKit project).
 *
 * getUserMedia is mocked with a canvas-backed stream so tests run without
 * real camera hardware. R2 upload endpoints are mocked via page.route().
 */
import { expect, test } from "@playwright/test";

const R2_BASE = "https://r2-e2e.example.com";
const RUN = Date.now().toString(36);
let keyCounter = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Install a canvas-backed fake getUserMedia before the page loads. */
async function mockGetUserMedia(
  page: import("@playwright/test").Page,
  { deny = false, noDevice = false } = {},
) {
  await page.addInitScript(
    ({ deny, noDevice }) => {
      const mediaDevices = {
        getUserMedia: (_constraints: MediaStreamConstraints) => {
          if (deny) {
            const e = new DOMException("Permission denied", "NotAllowedError");
            return Promise.reject(e);
          }
          if (noDevice) {
            const e = new DOMException("No camera", "NotFoundError");
            return Promise.reject(e);
          }
          // Create a canvas-backed stream so videoWidth/videoHeight are non-zero
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#336699";
          ctx.fillRect(0, 0, 640, 480);
          const stream = (canvas as HTMLCanvasElement & {
            captureStream(fps?: number): MediaStream;
          }).captureStream(5);
          return stream;
        },
      };
      Object.defineProperty(navigator, "mediaDevices", {
        get: () => mediaDevices,
        configurable: true,
      });
    },
    { deny, noDevice },
  );
}

/** Mock R2 upload and presigned URL endpoints. */
async function mockR2(page: import("@playwright/test").Page) {
  await page.route("/api/photos/upload-url", (route) => {
    const key = `e2e-cc-key-${++keyCounter}-${RUN}`;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ key, url: `${R2_BASE}/${key}` }),
    });
  });

  await page.route(`${R2_BASE}/**`, (route) => {
    const method = route.request().method();
    if (method === "OPTIONS" || method === "PUT") {
      return route.fulfill({
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    return route.fallback();
  });
}

// ---------------------------------------------------------------------------
// Test: full multi-item session
// ---------------------------------------------------------------------------

test("continuous capture: 3 shots + confirm + 2 shots + close → 2 items", async ({ page }) => {
  await mockGetUserMedia(page);
  await mockR2(page);

  await page.goto("/items/quick-add");
  await page.waitForLoadState("networkidle");

  // ── Activate camera ──────────────────────────────────────────────────────
  const activateBtn = page.locator(
    ".continuous-capture .capture-shutter",
  );
  await expect(activateBtn).toBeVisible({ timeout: 10_000 });
  await activateBtn.click();

  // After activation the button text changes to shutter mode
  const shutterBtn = page.locator(".continuous-capture .capture-shutter");
  await expect(shutterBtn).toBeVisible({ timeout: 10_000 });

  // ── Item 1: 3 shutter taps ───────────────────────────────────────────────
  await shutterBtn.click(); // creates item
  await page.waitForLoadState("networkidle");
  await shutterBtn.click(); // appends photo
  await page.waitForLoadState("networkidle");
  await shutterBtn.click(); // appends photo
  await page.waitForLoadState("networkidle");

  // Thumbnail strip should show 3 thumbnails
  const strip = page.locator(".capture-preview-strip");
  await expect(strip).toBeVisible({ timeout: 5_000 });
  await expect(strip.locator("img")).toHaveCount(3, { timeout: 10_000 });

  // ── Confirm (✓) ─────────────────────────────────────────────────────────
  const confirmBtn = page.locator(".capture-confirm");
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // After confirm the strip should clear
  await expect(strip.locator("img")).toHaveCount(0, { timeout: 5_000 });

  // ── Item 2: 2 shutter taps ───────────────────────────────────────────────
  await shutterBtn.click(); // creates item 2
  await page.waitForLoadState("networkidle");
  await shutterBtn.click(); // appends photo
  await page.waitForLoadState("networkidle");

  // Strip shows 2 thumbnails
  await expect(strip.locator("img")).toHaveCount(2, { timeout: 10_000 });

  // ── Close (✕) ────────────────────────────────────────────────────────────
  const closeBtn = page.locator(".capture-close");
  await expect(closeBtn).toBeVisible();
  await closeBtn.click();

  // Island should collapse (closed state returns null)
  await expect(page.locator(".continuous-capture")).not.toBeVisible({
    timeout: 5_000,
  });

  // ── Verify items in /items ───────────────────────────────────────────────
  await page.goto("/items");
  await page.waitForLoadState("networkidle");

  // Two new pending items should be visible
  const pendingItems = page.locator("li.item-pending");
  await expect(pendingItems.first()).toBeVisible({ timeout: 10_000 });
  const count = await pendingItems.count();
  expect(count).toBeGreaterThanOrEqual(2);
});

// ---------------------------------------------------------------------------
// Test: permission-denied fallback
// ---------------------------------------------------------------------------

test("continuous capture: NotAllowedError → file-input fallback is rendered", async ({ page }) => {
  await mockGetUserMedia(page, { deny: true });
  await mockR2(page);

  await page.goto("/items/quick-add");
  await page.waitForLoadState("networkidle");

  // Click the activation button
  const activateBtn = page.locator(".continuous-capture .capture-shutter");
  await expect(activateBtn).toBeVisible({ timeout: 10_000 });
  await activateBtn.click();

  // After denial the island should swap to the file-input fallback.
  // PhotoCapture renders a <label class="capture-btn"> wrapping the hidden input.
  const fallbackBtn = page.locator(
    ".capture-surface .photo-capture .capture-btn",
  );
  await expect(fallbackBtn).toBeVisible({ timeout: 10_000 });

  // Permission-denied hint should be shown
  const hint = page.locator(".capture-hint");
  await expect(hint).toBeVisible();
});
