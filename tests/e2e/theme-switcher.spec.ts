import { expect, test } from "@playwright/test";

// Dedicated theme-switcher coverage. The light↔dark toggle, persistence,
// FAB, and invalid-stored-value paths live in ui_polish.test.ts; this spec
// focuses on the things only an end-to-end run can prove:
//
//   - First-visit system preference is honoured under both colour schemes
//   - Roboto Condensed is fetched ONLY when Sternenhimmel is active
//   - The pre-paint script applies the theme class BEFORE the stylesheet
//     parses, so a stored-dark user never sees a flash of Raute light

test.describe("theme switcher (Raute ↔ Sternenhimmel)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    // Re-auth via stored session is handled by the chromium project.
    await page.goto("/items");
    await page.evaluate(() => localStorage.removeItem("servus-theme"));
  });

  test("first visit with system dark resolves to Sternenhimmel", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/items");
    await expect(page.locator("html")).toHaveClass(/theme-sternenhimmel/);
    // Default must NOT be persisted so a later OS change still flips it.
    const stored = await page.evaluate(() =>
      localStorage.getItem("servus-theme")
    );
    expect(stored).toBeNull();
  });

  test("first visit with system light resolves to Raute", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/items");
    await expect(page.locator("html")).toHaveClass(/theme-raute/);
    const stored = await page.evaluate(() =>
      localStorage.getItem("servus-theme")
    );
    expect(stored).toBeNull();
  });

  test("Roboto Condensed loads only under Sternenhimmel", async ({ page }) => {
    // Raute session: track every fonts.googleapis.com request.
    const fontRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("fonts.googleapis.com")) fontRequests.push(url);
    });

    await page.evaluate(() => localStorage.setItem("servus-theme", "raute"));
    await page.goto("/items");
    await page.waitForLoadState("networkidle");
    expect(
      fontRequests.some((u) => /Roboto\+Condensed/i.test(u)),
      "Raute must not fetch Roboto Condensed",
    ).toBe(false);

    // Toggle to Sternenhimmel — the conditional load fires.
    const toggle = page.locator("nav.top-nav [data-theme-toggle]").first();
    await toggle.click();
    await page.waitForFunction(() =>
      !!document.getElementById("servus-font-roboto-condensed")
    );
    // The stylesheet link must point at Roboto Condensed.
    const fontLinkHref = await page.locator(
      "#servus-font-roboto-condensed",
    ).getAttribute("href");
    expect(fontLinkHref ?? "").toMatch(/Roboto\+Condensed/i);
  });

  test("returning Sternenhimmel user does not flash Raute on load", async ({ page }) => {
    // Prime localStorage from a first visit.
    await page.evaluate(() =>
      localStorage.setItem("servus-theme", "sternenhimmel")
    );

    // Fresh navigation. The pre-paint script runs synchronously in <head>
    // BEFORE the stylesheet link parses, so the html class is already
    // theme-sternenhimmel by the time first paint happens. We assert that
    // (a) the SSR-rendered class is replaced or pre-emptively dark, and
    // (b) computed background-color of <body> is the Sternenhimmel ground.
    await page.goto("/items", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveClass(/theme-sternenhimmel/);

    const bodyBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // #0E1830 in rgb() form
    expect(bodyBg.replace(/\s+/g, "")).toBe("rgb(14,24,48)");

    // <meta name="theme-color"> tracks the active theme.
    const themeColor = await page.locator('meta[name="theme-color"]')
      .getAttribute("content");
    expect(themeColor?.toUpperCase()).toBe("#0E1830");
  });

  test("returning Raute user does not flash Sternenhimmel on load", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("servus-theme", "raute"));
    // Force system dark to ensure the stored value wins (without the
    // pre-paint script, the OS dark preference would briefly apply).
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/items", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveClass(/theme-raute/);
    const bodyBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // #F4ECDA in rgb() form
    expect(bodyBg.replace(/\s+/g, "")).toBe("rgb(244,236,218)");
  });
});
