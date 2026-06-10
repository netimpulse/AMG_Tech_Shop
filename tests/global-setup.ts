import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Globaler Setup-Schritt vor allen Playwright-Tests.
 *
 * Falls der Store passwortgeschuetzt ist, wird der Schutz via
 * SHOPIFY_STOREFRONT_PASSWORD umgangen. Der Login laeuft als
 * Form-POST ueber die Request-API — das ist robuster als das
 * UI-Formular, weil Themes das Passwortfeld hinter einem Dialog
 * verstecken koennen. Falls kein Passwort gesetzt ist, wird eine
 * leere Session gespeichert.
 */
export default async function globalSetup(_config: FullConfig) {
  const STORE_BASE = "https://zjyfg5-ya.myshopify.com";
  const password = process.env.SHOPIFY_STOREFRONT_PASSWORD;

  const authDir = path.resolve("playwright/.auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, "storefront.json");

  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });

  if (password) {
    try {
      // Form-POST setzt den storefront_digest-Cookie im Context
      const response = await context.request.post(`${STORE_BASE}/password`, {
        form: {
          form_type: "storefront_password",
          utf8: "✓",
          password,
        },
      });
      if (!response.ok() && response.status() !== 302) {
        console.warn(`Storefront-Login: unerwarteter Status ${response.status()}`);
      }
    } catch (e) {
      console.warn("Storefront-Login uebersprungen:", (e as Error).message);
    }
  }

  await context.storageState({ path: statePath });
  await browser.close();
}
