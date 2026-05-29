import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

// Playwright runs in Node.js (not Deno), so use process.env here.
const isCI = !!process.env.CI;

// Fixed test credentials — used in webServer and E2E tests.
export const E2E_SESSION_KEY = "e2e" + "0".repeat(60); // 64-char hex
export const E2E_SEED_USERS = JSON.stringify([
  { username: "testuser", password: "TestPw!1234" },
]);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
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
    env: {
      SERVUS_SESSION_KEY: E2E_SESSION_KEY,
      SERVUS_SEED_USERS: E2E_SEED_USERS,
      DENO_KV_PATH: ":memory:",
    },
  },
});
