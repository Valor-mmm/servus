import { test as setup } from "@playwright/test";

const USER = "testuser";
const PASS = "TestPw!1234";

setup("authenticate as testuser", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="username"]', USER);
  await page.fill('[name="password"]', PASS);
  await page.click('[type="submit"]');
  await page.waitForURL("/");
  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
});
