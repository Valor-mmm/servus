/**
 * Playwright config for running E2E tests against the live production deployment.
 *
 * Usage:
 *   PROD_USERNAME=monster PROD_PASSWORD=<pw> npx playwright test --config=playwright.prod.config.ts
 *
 * This config does NOT start a local web server — it hits the real deployment.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/prod",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: "https://servus.valor.codes",
    trace: "on",
    launchOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
