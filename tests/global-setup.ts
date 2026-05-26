import { chromium } from "@playwright/test";
import { BASE } from "./fixtures";

/**
 * Unlocks the password-protected dev storefront once and persists the
 * session cookies to playwright/.auth/state.json (gitignored).
 */
export default async function globalSetup() {
  const password = process.env.SHOPIFY_STOREFRONT_PASSWORD;
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await page.goto(`${BASE}/password`, { waitUntil: "domcontentloaded" });

  const pwInput = page.locator('input[name="password"]').first();
  if (password && (await pwInput.count())) {
    await pwInput.fill(password);
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => {}),
      page.locator('form[action*="/password"] button, form[action*="/password"] [type="submit"]').first().click().catch(() => {}),
    ]);
  }

  await context.storageState({ path: "playwright/.auth/state.json" });
  await browser.close();
}
