/**
 * Shared test helper: mock navigator.mediaDevices so photo specs that
 * exercise the PhotoCapture (file-input) fallback path can run in any
 * browser without real camera hardware or permission prompts.
 *
 * Call `denyGetUserMedia(page)` before `page.goto()` to force
 * ContinuousCapture to fall back to the PhotoCapture file-input island.
 */

/**
 * Remove getUserMedia from mediaDevices so isContinuousCaptureSupported()
 * returns false. ContinuousCapture then renders the PhotoCapture file-input
 * fallback immediately on mount — no activation tap required.
 */
export async function denyGetUserMedia(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      get: () => ({}),
      configurable: true,
    });
  });
}
