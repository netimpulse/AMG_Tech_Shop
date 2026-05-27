/**
 * Test-Fixtures fuer den Visual-QA-Workflow im AMG Tech Shop.
 *
 * Da kein separates QA-Preview-Theme und kein dediziertes
 * QA-Block-Test-Template existiert, nutzen Tests bestehende Pages
 * und Templates. Default-Test-URL fuer neue Bloecke ist die Homepage,
 * die Claude waehrend des Tests temporaer um den neuen Block ergaenzt
 * (siehe CLAUDE.md Backup-Restore-Workflow).
 */

export const QA = {
  /** ID des MAIN-Themes (Live!). Tests pushen direkt hierhin. */
  themeId: "184912576838",

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
  // preview_theme_id ist bei MAIN-Theme nicht zwingend noetig, aber harmlos
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}preview_theme_id=${QA.themeId}`;
}
