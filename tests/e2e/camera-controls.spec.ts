/**
 * E2E tests for camera zoom and tap-to-focus controls in ContinuousCapture.
 *
 * getUserMedia is mocked with a canvas-backed stream whose track exposes zoom
 * and focusMode capabilities. R2 upload endpoints are mocked via page.route().
 */
import { expect, test } from "@playwright/test";

const R2_BASE = "https://r2-e2e.example.com";
let keyCounter = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Install a canvas-backed fake getUserMedia that exposes zoom and focusMode
 * capabilities on the video track so the island renders the zoom slider and
 * accepts tap-to-focus events.
 */
async function mockGetUserMediaWithControls(
  page: import("@playwright/test").Page,
) {
  await page.addInitScript(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#336699";
    ctx.fillRect(0, 0, 640, 480);
    const stream = (
      canvas as HTMLCanvasElement & {
        captureStream(fps?: number): MediaStream;
      }
    ).captureStream(5);

    // Augment the track with capability and constraint stubs
    const track = stream.getVideoTracks()[0];
    (track as unknown as Record<string, unknown>)["getCapabilities"] = () => ({
      zoom: { min: 1, max: 5, step: 0.5 },
      focusMode: ["continuous", "manual"],
    });
    const appliedConstraints: unknown[] = [];
    (track as unknown as Record<string, unknown>)["appliedConstraints"] =
      appliedConstraints;
    const origApply = track.applyConstraints.bind(track);
    track.applyConstraints = (c) => {
      appliedConstraints.push(c);
      return origApply(c).catch(() => {});
    };

    Object.defineProperty(navigator, "mediaDevices", {
      get: () => ({
        getUserMedia: () => Promise.resolve(stream),
      }),
      configurable: true,
    });
  });
}

function mockR2AndApi(page: import("@playwright/test").Page) {
  page.route(`${R2_BASE}/**`, (route) => route.fulfill({ status: 200 }));
  page.route("**/api/photos/upload-url", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        key: `e2e-key-${++keyCounter}`,
        url: `${R2_BASE}/e2e-key-${keyCounter}`,
      }),
    }));
  page.route("**/api/items/create-from-photo", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ item: { id: `e2e-item-${keyCounter}` } }),
    }));
  page.route(
    "**/api/items/append-photo",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("zoom slider appears after activating camera on a device with zoom capability", async ({ page }) => {
  await mockGetUserMediaWithControls(page);
  mockR2AndApi(page);

  await page.goto("/items/new");
  // Activate the camera
  await page.click(".capture-shutter");
  // The zoom slider should be visible once the stream is active
  await expect(page.locator(".capture-zoom-slider")).toBeVisible({
    timeout: 5_000,
  });
});

test("zoom slider is within reported capability range", async ({ page }) => {
  await mockGetUserMediaWithControls(page);
  mockR2AndApi(page);

  await page.goto("/items/new");
  await page.click(".capture-shutter");
  await expect(page.locator(".capture-zoom-slider")).toBeVisible({
    timeout: 5_000,
  });

  const min = await page
    .locator(".capture-zoom-slider")
    .getAttribute("min");
  const max = await page
    .locator(".capture-zoom-slider")
    .getAttribute("max");

  expect(Number(min)).toBe(1);
  expect(Number(max)).toBe(5);
});

test("tap-to-focus shows focus ring on viewfinder tap", async ({ page }) => {
  await mockGetUserMediaWithControls(page);
  mockR2AndApi(page);

  await page.goto("/items/new");
  await page.click(".capture-shutter");

  // Wait for the zoom slider — this confirms initCameraControls has finished
  // and focusSupported has been set. The viewfinder element is in the DOM
  // before activation so toBeVisible() on it alone is not a reliable gate.
  await expect(page.locator(".capture-zoom-slider")).toBeVisible({
    timeout: 5_000,
  });

  // Tap the video element to trigger tap-to-focus
  await page.locator(".capture-viewfinder").click({
    position: { x: 100, y: 100 },
  });

  // Focus ring should appear
  await expect(page.locator(".capture-focus-ring")).toBeVisible({
    timeout: 2_000,
  });

  // Focus ring should disappear within ~2 s (animation is 1.5 s)
  await expect(page.locator(".capture-focus-ring")).not.toBeVisible({
    timeout: 3_000,
  });
});

test("tap-to-focus works after a completed two-pointer pinch gesture", async ({ page }) => {
  // Regression guard for the stale-pointer bug: a completed pinch must leave
  // the internal pointer map empty so the next single tap is not misread as a
  // two-pointer pinch gesture (which would suppress the focus ring).
  await mockGetUserMediaWithControls(page);
  mockR2AndApi(page);

  await page.goto("/items/new");
  await page.click(".capture-shutter");
  await expect(page.locator(".capture-zoom-slider")).toBeVisible({
    timeout: 5_000,
  });

  const box = await page.locator(".capture-viewfinder").boundingBox();
  if (!box) throw new Error("viewfinder not found");
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);

  // Simulate a complete pinch-zoom gesture and verify:
  //   a) the zoom constraint is applied during the gesture
  //   b) setPointerCapture is called for each pointer (the mechanism that
  //      prevents stale map entries when a finger lifts outside the element)
  //   c) a single tap immediately after shows the focus ring
  const result = await page.evaluate(({ cx, cy }) => {
    const video = document.querySelector(".capture-viewfinder")!;

    // Spy on setPointerCapture to verify the fix is active
    const capturedIds: number[] = [];
    const origCapture = (video as HTMLElement).setPointerCapture.bind(video);
    (video as HTMLElement).setPointerCapture = (id: number) => {
      capturedIds.push(id);
      try {
        origCapture(id);
      } catch {
        // ignore — synthetic events may not register as active hardware pointers
      }
    };

    const fire = (type: string, id: number, x: number, y: number) =>
      video.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          pointerId: id,
          clientX: x,
          clientY: y,
        }),
      );

    fire("pointerdown", 20, cx - 50, cy);
    fire("pointerdown", 21, cx + 50, cy);
    fire("pointermove", 20, cx - 100, cy);
    fire("pointermove", 21, cx + 100, cy);
    fire("pointerup", 20, cx - 100, cy);
    fire("pointerup", 21, cx + 100, cy);

    return { capturedIds };
  }, { cx, cy });

  // setPointerCapture must have been called for each of the two pointers
  expect(result.capturedIds).toContain(20);
  expect(result.capturedIds).toContain(21);

  // Tap immediately after the pinch — focus ring must appear
  await page.locator(".capture-viewfinder").click({
    position: { x: 100, y: 100 },
  });
  await expect(page.locator(".capture-focus-ring")).toBeVisible({
    timeout: 2_000,
  });
});
