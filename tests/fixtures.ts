/**
 * Test-Fixtures fuer den Visual-QA-Workflow im AMG Tech Shop.
 *
 * Tests laufen gegen das UNPUBLISHED-Theme "Kopie von AMG_Tech_Shop/main"
 * (ID 191479906630). Das MAIN-Theme bleibt fuer Tests komplett unberuehrt
 * — Kunden sehen Test-Aenderungen niemals.
 *
 * Da kein dediziertes QA-Block-Test-Template existiert, nutzen Tests
 * bestehende Pages und Templates. Default-Test-URL fuer neue Bloecke
 * ist die Homepage, in die Claude den Block temporaer einbaut.
 */

export const QA = {
  /** ID des UNPUBLISHED Copy-Themes — isoliertes Test-Target. */
  themeId: "191479906630",

  /** Bekannte Fixtures im Shop. */
  product: {
    handle: "trockeneispellets-1-5-mm",
  },
  collection: {
    handle: "frontpage",
  },

  /** Mapping: Template-Typ -> Pfad ohne Query-String. */
  paths: {
    home: "/",
    qaBlock: "/",  // kein dediziertes QA-Template; Block wird temporaer auf Home eingebaut
    product: "/products/trockeneispellets-1-5-mm",
    collection: "/collections/frontpage",
    cart: "/cart",
    contact: "/pages/contact",
    faq: "/pages/faq",
    search: "/search?q=trockeneis",
    notFound: "/this-page-does-not-exist",
  },
} as const;

export function withTheme(path: string): string {
  // preview_theme_id ZWINGEND noetig — sonst rendert Shopify das MAIN-Theme
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}preview_theme_id=${QA.themeId}`;
}
