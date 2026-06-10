import { test, expect } from "@playwright/test";
import { QA, withTheme } from "../fixtures";

/**
 * Visual-QA fuer die neue Trockeneis-Produktsektion (dry-ice-product).
 *
 * Erwartete Produktdaten (Store amgtechtrockeneis):
 *   Gewicht: 1KG..4KG (nur Abholung, Metafield expresslieferung=false),
 *            5KG, 10KG, 15KG
 *   Verpackung: "Mit Box" / "Eigene Box" (Eigene Box guenstiger)
 *   Preise (Platzhalter): 5KG Mit Box 10,00 € / Eigene Box 7,00 €
 */

test.describe("dry-ice-product", () => {
  test.beforeEach(async ({ page }) => {
    // Cookie-Banner + Theme-Preview-Bar verdecken sonst Klickziele (v. a. mobil)
    await page.addInitScript(() => {
      const hide = () => {
        const style = document.createElement("style");
        style.textContent =
          "#shopify-pc__banner, #PBarNextFrameWrapper, #preview-bar-iframe { display: none !important; }";
        document.documentElement.appendChild(style);
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hide);
      } else {
        hide();
      }
    });
    await page.goto(withTheme(QA.paths.product), { waitUntil: "domcontentloaded" });
    await page.waitForSelector("dry-ice-product [data-dip-option-group]");
  });

  const root = (page: import("@playwright/test").Page) =>
    page.locator("dry-ice-product");

  const priceText = async (page: import("@playwright/test").Page) =>
    (await page.locator("[data-dip-price]").innerText()).trim();

  test("rendert Titel, Preis und sortierte Gewichts-Optionen", async ({ page }) => {
    await expect(page.locator(".dip-head__title")).toContainText(/trockeneis/i);
    await expect(page.locator("[data-dip-price]")).toContainText("€");

    // Gewichtsgruppe vorhanden, numerisch sortiert: erste Pill = 1KG
    const weightGroup = page.locator('[data-dip-option-group]').first();
    const pills = weightGroup.locator("[data-dip-pill]");
    await expect(pills.first()).toContainText("1KG");

    // "Mehr auf Anfrage" als letzte Pill
    await expect(pills.last()).toContainText(/mehr auf anfrage/i);
  });

  test("Gewichtswechsel aktualisiert den Preis", async ({ page }) => {
    const before = await priceText(page);
    await page.locator('[data-dip-pill][data-value="15KG"]').click();
    await expect
      .poll(async () => priceText(page))
      .not.toBe(before);
  });

  test("Selbstabholung: Box-Wahl sichtbar, Eigene Box reduziert den Preis", async ({ page }) => {
    // Selbstabholung ist vorausgewaehlt -> Box-Panel sichtbar
    await expect(page.locator("[data-dip-box-panel]")).toBeVisible();

    // 5KG waehlen, Mit Box ist Default (Preisformat haengt von Shop-Locale ab)
    await page.locator('[data-dip-pill][data-value="5KG"]').click();
    await expect(page.locator("[data-dip-price]")).toContainText(/10[.,]00/);

    // Eigene Box -> Preis sinkt auf 7,00 €, Erspernis-Badge sichtbar
    await page.locator('[data-dip-box][data-value="Eigene Box"]').click();
    await expect(page.locator("[data-dip-price]")).toContainText(/7[.,]00/);
    await expect(page.locator("[data-dip-box-save]")).toContainText(/sie sparen/i);

    // Zusammenfassung: Abholung kostenlos
    await expect(page.locator("[data-dip-sum-ship-value]")).toContainText(/kostenlos/i);
  });

  test("Express: Kleinmengen ausgeblendet, GO! zuerst, Dienstleister-Pflicht", async ({ page }) => {
    await page.locator('[data-dip-method="express"]').click();

    // Box-Wahl zu, Carrier-Panel auf
    await expect(page.locator("[data-dip-box-panel]")).toBeHidden();
    await expect(page.locator("[data-dip-carrier-panel]")).toBeVisible();

    // Kleinmengen (1-4 kg, Metafield expresslieferung=false) sind ausgeblendet
    await expect(page.locator('[data-dip-pill][data-value="1KG"]')).toBeHidden();
    await expect(page.locator('[data-dip-pill][data-value="4KG"]')).toBeHidden();
    await expect(page.locator('[data-dip-pill][data-value="5KG"]')).toBeVisible();

    // GO! Express steht an erster Stelle, kein DPD vorhanden
    const carriers = page.locator("[data-dip-carrier]");
    await expect(carriers.first()).toContainText("GO! Express");
    await expect(page.locator("[data-dip-carrier-panel]")).not.toContainText("DPD");

    // Ohne Dienstleister blockt der Submit mit Fehlermeldung
    await page.locator("[data-dip-atc]").click();
    await expect(page.locator("[data-dip-carrier-error]")).toBeVisible();
    await expect(page).toHaveURL(/products\//);

    // Dienstleister waehlen -> Fehler verschwindet, Summary zeigt Carrier
    await carriers.first().click();
    await expect(page.locator("[data-dip-carrier-error]")).toBeHidden();
    await expect(page.locator("[data-dip-sum-ship-value]")).toContainText("GO! Express");
  });

  test("Mehr auf Anfrage deaktiviert den Kauf-Button und zeigt Kontakt-Hinweis", async ({ page }) => {
    // Hinweis ist initial ausgeblendet
    await expect(page.locator("[data-dip-anfrage]")).toBeHidden();

    await page.locator('[data-dip-pill][data-value="__anfrage__"]').click();
    await expect(page.locator("[data-dip-anfrage]")).toBeVisible();
    await expect(page.locator("[data-dip-atc]")).toBeDisabled();
    await expect(page.locator("[data-dip-price]")).toContainText(/auf anfrage/i);
  });

  test("Warenkorb: Variante + Lieferoption landen im Cart", async ({ page }) => {
    // Selbstabholung + 5KG + Eigene Box
    await page.locator('[data-dip-pill][data-value="5KG"]').click();
    await page.locator('[data-dip-box][data-value="Eigene Box"]').click();
    await page.locator("[data-dip-atc]").click();

    await page.waitForURL(/\/cart/);
    const body = page.locator("body");
    await expect(body).toContainText(/eigene box/i);
    await expect(body).toContainText(/selbstabholung/i);
  });

  test("kein horizontaler Scroll", async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
