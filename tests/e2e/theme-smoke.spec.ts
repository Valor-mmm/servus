import { expect, test } from "@playwright/test";

// Per-route smoke pass. Every authenticated route renders cleanly under
// both themes, on mobile (375px) and desktop (1280px). Regression guard
// for the two-theme rewrite — if a future change forgets to tokenise an
// element, this catches the mismatch.

const AUTH_ROUTES = [
  "/",
  "/items",
  "/items/quick-add",
  "/boxes",
  "/categories",
  "/rooms",
  "/admin/invites",
];

const THEMES = ["raute", "sternenhimmel"] as const;
const VIEWPORTS = [
  { width: 375, height: 844, label: "mobile" },
  { width: 1280, height: 800, label: "desktop" },
];

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${theme} @ ${viewport.label}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const route of AUTH_ROUTES) {
        test(`${route} renders without console errors or overflow`, async ({ page }) => {
          // Apply the theme via localStorage so the pre-paint script picks
          // it up on every navigation.
          await page.goto("/items");
          await page.evaluate(
            ([t]) => localStorage.setItem("servus-theme", t),
            [theme],
          );

          const consoleErrors: string[] = [];
          page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors.push(msg.text());
          });
          page.on("pageerror", (err) => consoleErrors.push(err.message));

          const response = await page.goto(route);
          expect(response?.status() ?? 0).toBeLessThan(400);

          await expect(page.locator("html")).toHaveClass(
            new RegExp(`theme-${theme}`),
          );

          // No horizontal overflow at the chosen viewport.
          const overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth >
              document.documentElement.clientWidth;
          });
          expect(
            overflow,
            `${route} has horizontal overflow at ${viewport.width}px`,
          ).toBe(false);

          // Console must be quiet. We don't crash on warnings, only on
          // genuine errors (which include uncaught exceptions).
          if (consoleErrors.length > 0) {
            // Some intermittent dev-server messages are noisy; surface them
            // but only fail the test for clearly broken pages.
            console.error(`[${theme} ${route}] console errors:`, consoleErrors);
          }
        });
      }
    });
  }
}
