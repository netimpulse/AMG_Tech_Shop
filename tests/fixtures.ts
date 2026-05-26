const STORE = (process.env.SHOPIFY_STORE_URL || "dev-store-4ogqgshg.myshopify.com").replace(/^https?:\/\//, "");
export const BASE = `https://${STORE}`;

// Unpublished QA target theme (Dev Sandbox). Tests preview this theme so the
// live storefront theme stays untouched.
export const THEME_ID = Number(process.env.QA_THEME_ID || 145624989811);

export const QA = {
  paths: {
    home: "/",
    // QA fixture product renders the trockeneis-product section via product.json.
    product: "/products/qa-test-produkt",
  },
};

export function withTheme(path: string): string {
  const url = new URL(path, BASE);
  url.searchParams.set("preview_theme_id", String(THEME_ID));
  return url.toString();
}
