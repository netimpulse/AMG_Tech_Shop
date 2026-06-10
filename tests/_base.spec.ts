import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "./fixtures";

test.describe("AMG Shop – Generische Visual-Checks", () => {
  test("Homepage rendert ohne Konsolen- oder Page-Errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      // Netzwerk-Ladefehler (z. B. 401 hinter Passwortschutz, geblockte
      // Tracker) sind Umgebungsrauschen — uns interessieren Theme-Fehler.
      if (/Failed to load resource/i.test(m.text())) return;
      errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(withTheme(QA.paths.home), { waitUntil: "networkidle" });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      await page.screenshot({
        path: path.join(dir, `${testInfo.project.name}-home.png`),
        fullPage: true,
      });
    } catch {
      // Sehr lange Seiten sprengen WebKits 32767px-Screenshot-Limit —
      // dann reicht der Viewport-Screenshot.
      await page.screenshot({
        path: path.join(dir, `${testInfo.project.name}-home.png`),
      });
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Hauptinhalt ist sichtbar", async ({ page }) => {
    await page.goto(withTheme(QA.paths.home));
    const main = page.locator("main, [role='main'], #MainContent").first();
    await expect(main).toBeVisible();
  });
});
