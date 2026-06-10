import { test, expect, type Page } from "@playwright/test";
import { QA, withTheme } from "../fixtures";

/**
 * Visual-QA fuer die neue Trockeneis-Produktsektion (dry-ice-product).
 *
 * Erwartete Produktdaten (trockeneispellets-1-5-mm):
 *   Druchmesser: 3.0
 *   KG: 1..4 (nur Abholung, Metafield expresslieferung=false), 5, 10, 15, 20
 *   Verpackung: "Mit Box" / "Eigene Box" (Eigene Box guenstiger)
 *
 * Preis-Checks sind bewusst relativ (steigt/sinkt) statt absolut,
 * damit Preisanpassungen im Admin die Tests nicht brechen.
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

  /** Gewichts-Optionsgruppe (Legende "KG") */
  const weightGroup = (page: Page) =>
    page
      .locator("[data-dip-option-group]")
      .filter({ has: page.locator("legend", { hasText: /^\s*KG\s*$/i }) });

  /** Preis als Zahl aus der Preisanzeige lesen */
  const priceValue = async (page: Page) => {
    const text = (await page.locator("[data-dip-price]").innerText()).trim();
    const m = text.replace(/\./g, ",").match(/(\d+),(\d{2})/);
    if (!m) return NaN;
    return parseFloat(`${m[1]}.${m[2]}`);
  };

  test("rendert Titel, Preis und sortierte Gewichts-Optionen", async ({ page }) => {
    await expect(page.locator(".dip-head__title")).toContainText(/trockeneis/i);
    await expect(page.locator("[data-dip-price]")).toContainText("€");

    // KG-Gruppe vorhanden, numerisch sortiert: erste Pill = 1
    const pills = weightGroup(page).locator("[data-dip-pill]");
    await expect(pills.first()).toHaveAttribute("data-value", "1");

    // "Mehr auf Anfrage" als letzte Pill
    await expect(pills.last()).toContainText(/mehr auf anfrage/i);
  });

  test("Gewichtswechsel aktualisiert den Preis", async ({ page }) => {
    await weightGroup(page).locator('[data-dip-pill][data-value="5"]').click();
    const before = await priceValue(page);
    await weightGroup(page).locator('[data-dip-pill][data-value="15"]').click();
    await expect.poll(async () => priceValue(page)).toBeGreaterThan(before);
  });

  test("Selbstabholung: Box-Wahl sichtbar, Eigene Box reduziert den Preis", async ({ page }) => {
    // Selbstabholung ist vorausgewaehlt -> Box-Panel sichtbar
    await expect(page.locator("[data-dip-box-panel]")).toBeVisible();

    // 5 kg waehlen, Mit Box ist Default
    await weightGroup(page).locator('[data-dip-pill][data-value="5"]').click();
    await page.locator('[data-dip-box][data-value="Mit Box"]').click();
    const withBox = await priceValue(page);

    // Eigene Box -> Preis sinkt, Erspernis-Badge sichtbar
    await page.locator('[data-dip-box][data-value="Eigene Box"]').click();
    await expect.poll(async () => priceValue(page)).toBeLessThan(withBox);
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
    await expect(weightGroup(page).locator('[data-dip-pill][data-value="1"]')).toBeHidden();
    await expect(weightGroup(page).locator('[data-dip-pill][data-value="4"]')).toBeHidden();
    await expect(weightGroup(page).locator('[data-dip-pill][data-value="5"]')).toBeVisible();

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

    await weightGroup(page).locator('[data-dip-pill][data-value="__anfrage__"]').click();
    await expect(page.locator("[data-dip-anfrage]")).toBeVisible();
    await expect(page.locator("[data-dip-atc]")).toBeDisabled();
    await expect(page.locator("[data-dip-price]")).toContainText(/auf anfrage/i);
  });

  test("Warenkorb: Variante + Lieferoption landen im Cart", async ({ page }) => {
    // Selbstabholung + 5 kg + Eigene Box
    await weightGroup(page).locator('[data-dip-pill][data-value="5"]').click();
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
