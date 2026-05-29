import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "./fixtures";

/**
 * QA fuer die Trockeneis-Produkt-Sektion (Katalog-Block).
 * Prueft die neuen Funktionen:
 *  - mm-Angabe in deutscher Schreibweise (Komma)
 *  - "Eigene Box"-Toggle (nur bei Selbstabholung sichtbar)
 *  - Lieferarten: GO! Express steht an erster Stelle
 *  - keine JS-/Page-Errors
 */
test.describe("Trockeneis-Produkt – Katalog-Block", () => {
  test("Produktseite rendert ohne Fehler + Screenshot", async ({ page }, testInfo) => {
    // Bekannte, themeweite Vorab-Fehler (doppelt eingebundene Such-/Modal-Skripte)
    // sind nicht Teil dieser Sektion und werden ausgefiltert.
    const KNOWN_NOISE = /already been declared|SearchForm|PredictiveSearch|DetailsModal/;
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !KNOWN_NOISE.test(m.text())) errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => {
      if (!KNOWN_NOISE.test(e.message)) errors.push(`pageerror: ${e.message}`);
    });

    const response = await page.goto(withTheme(QA.paths.product), { waitUntil: "networkidle" });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const root = page.locator("[data-trockeneis-section]").first();
    await expect(root).toBeVisible();

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `${testInfo.project.name}-trockeneis-product.png`),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Preis-Anzeige ist sichtbar", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const price = page.locator("[data-te-price]").first();
    await expect(price).toBeVisible();
    await expect(price).toContainText("€");
  });

  test("mm-Angabe nutzt Komma statt Punkt", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const sizeGroup = page.locator('[data-te-option="size"]');
    await expect(sizeGroup).toBeVisible();
    const labels = await sizeGroup.locator(".te-option-label").allInnerTexts();
    // Keine Pelletgroesse-Anzeige darf eine Dezimalzahl mit Punkt enthalten (z.B. "3.0")
    for (const label of labels) {
      expect(label, `Label "${label}" enthaelt Dezimalpunkt`).not.toMatch(/\d\.\d/);
    }
  });

  test('"Eigene Box"-Toggle nur bei Selbstabholung sichtbar', async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const ownBox = page.locator("[data-te-own-box]");
    // initial: versteckt (keine Lieferoption gewaehlt)
    await expect(ownBox).toBeHidden();

    await page.locator('[data-ship-method="pickup"] .te-ship-method__header').click();
    await expect(ownBox).toBeVisible();

    // Express waehlen -> Toggle wieder weg
    const express = page.locator('[data-ship-method="express"] .te-ship-method__header');
    if (await express.count()) {
      await express.click();
      await expect(ownBox).toBeHidden();
    }
  });

  test("GO! Express steht an erster Stelle der Lieferarten", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const express = page.locator('[data-ship-method="express"] .te-ship-method__header');
    if (!(await express.count())) test.skip();
    await express.click();
    const firstCarrier = page.locator("[data-carrier]").first();
    await expect(firstCarrier).toHaveAttribute("data-carrier", "go");
  });
});
