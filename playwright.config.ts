import { defineConfig, devices } from "@playwright/test";
import { BASE } from "./tests/fixtures";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: BASE,
    storageState: "playwright/.auth/state.json",
    screenshot: "on",
    video: "off",
    trace: "retain-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
