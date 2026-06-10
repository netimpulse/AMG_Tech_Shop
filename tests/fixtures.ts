/**
 * Test-Fixtures fuer den Visual-QA-Workflow im AMG Tech Shop.
 *
 * Store: amgtechtrockeneis.myshopify.com
 *
 * Tests laufen gegen das UNPUBLISHED-Theme "AMG_Tech_Shop/main (Kopie)"
 * (ID 188973449564). Das MAIN-Theme (ID 187811070300) bleibt fuer Tests
 * komplett unberuehrt — Kunden sehen Test-Aenderungen niemals.
 *
 * Theme-Push erfolgt ueber die Shopify Admin API (themeFilesUpsert auf
 * das UNPUBLISHED-Theme), da fuer diesen Store kein CLI-Theme-Token
 * hinterlegt ist.
 */

export const QA = {
  /** ID des UNPUBLISHED Copy-Themes — isoliertes Test-Target. */
  themeId: "188973449564",

  /** Bekannte Fixtures im Shop. */
  product: {
    handle: "trockeneis-pallets",
  },

  /** Mapping: Template-Typ -> Pfad ohne Query-String. */
  paths: {
    home: "/",
    qaBlock: "/", // kein dediziertes QA-Template; Block wird temporaer auf Home eingebaut
    product: "/products/trockeneis-pallets",
    cart: "/cart",
    contact: "/pages/contact",
    search: "/search?q=trockeneis",
    notFound: "/this-page-does-not-exist",
  },
} as const;

export function withTheme(path: string): string {
  // preview_theme_id ZWINGEND noetig — sonst rendert Shopify das MAIN-Theme
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}preview_theme_id=${QA.themeId}`;
}
