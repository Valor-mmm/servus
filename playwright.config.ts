import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

// Playwright runs in Node.js (not Deno), so use process.env here.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "list",

  use: {
    baseURL: "http://localhost:8000",
    trace: "on-first-retry",
    // Required on Linux hosts without a setuid sandbox (Fedora, bare CI runners).
    launchOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "deno task start",
    url: "http://localhost:8000",
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },
});
