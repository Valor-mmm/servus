import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const USER = "testuser";
const PASS = "TestPw!1234";

const authDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  ".auth",
);
const authFile = path.join(authDir, "user.json");

setup("authenticate as testuser", async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });
  await page.goto("/login");
  await page.fill('[name="username"]', USER);
  await page.fill('[name="password"]', PASS);
  await page.click('[type="submit"]');
  await page.waitForURL("/");
  await page.context().storageState({ path: authFile });
});
