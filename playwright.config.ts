import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-QA Konfiguration fuer AMG Tech Shop.
 *
 * Tests laufen gegen das MAIN-Theme (kein QA-Preview). preview_theme_id
 * wird trotzdem mitgegeben fuer Konsistenz, ist aber im MAIN-Fall optional.
 *
 * Storefront-Passwort-Auth via tests/global-setup.ts — wenn der Store
 * keinen Passwortschutz hat, wird der Login-Schritt automatisch geskippt.
 */
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/global-setup.ts", "**/fixtures.ts"],
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "https://zjyfg5-ya.myshopify.com",
    storageState: "playwright/.auth/storefront.json",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile",  use: { ...devices["iPhone 13"] } },
  ],
});
