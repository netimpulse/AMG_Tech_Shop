# AMG Tech Shop — Repo-spezifische Anweisungen

## Store & Theme-Setup

Store: `amgtechtrockeneis.myshopify.com` (Storefront passwortgeschuetzt)

| Theme | ID | Zweck |
|---|---|---|
| `AMG_Tech_Shop/main` | `187811070300` | MAIN/live. Nicht direkt anfassen. |
| `AMG_Tech_Shop/main` (Kopie) | `188973449564` | UNPUBLISHED Test-Theme. Theme-Pushes gehen ausschliesslich hierhin. Customer sehen das nie. |

Das Test-Theme ist ein **freier Sandbox**: Claude kann darin beliebig
viele Sections, Blocks, Templates ein- oder umbauen, ohne danach
aufzuraeumen. Der Stand bleibt zwischen Sessions erhalten und wird
beim naechsten Test einfach ueberschrieben.

Hinweis: Der hinterlegte `SHOPIFY_CLI_THEME_TOKEN` stammt noch vom
alten Store (`zjyfg5-ya.myshopify.com`) und funktioniert fuer diesen
Store NICHT. Theme-Pushes laufen stattdessen ueber die Shopify Admin
API (`themeFilesUpsert` via Shopify MCP) auf das UNPUBLISHED-Theme.

## Workflow

Standard `shopify-visual-qa` Workflow gilt 1:1.

Pro Section/Block-Auftrag:

1. Code schreiben (`sections/`, `snippets/`, `assets/`)
2. Wenn der Block auf einer Seite sichtbar werden soll, ins passende
   Template einbauen (z. B. `templates/index.json` fuer Home,
   `templates/product.trockeneis.json` fuer die Trockeneis-Produktseite)
3. Geaenderte Theme-Dateien via Admin API (`themeFilesUpsert`) ins
   Test-Theme `188973449564` pushen
4. `npx playwright test` → laeuft gegen `/?preview_theme_id=188973449564`
5. Bei rotem Test: korrigieren, ab Schritt 3 wiederholen (max 3 Iterationen)
6. Bei gruenem Test: `git commit` + `git push`, PR an main

Der Nutzer entscheidet beim PR-Review, was tatsaechlich ins Live-Theme
gemergt wird. Test-Theme-Stand wird davon nicht beruehrt.

## Keine Pages im Admin anlegen

Tests laufen gegen die vorhandene Homepage `/`. Es wird KEINE neue
QA-Page im Shop-Admin angelegt. Falls Claude eine bessere Test-URL
braucht, kann er auf bereits vorhandene Pages ausweichen — siehe
`QA.paths` in `tests/fixtures.ts`.

## Trockeneis-Produkt

- Produkt: `trockeneis-pallets` (Template-Suffix `trockeneis` →
  `templates/product.trockeneis.json`, Section `dry-ice-product`)
- Optionen: `Gewicht` (1KG–15KG) × `Verpackung` (Mit Box / Eigene Box).
  Preisreduktion bei eigener Box laeuft ueber echte Varianten-Preise.
- Metafields (namespace `custom`, boolean, leer = ja):
  - `selbstabholung` / `expresslieferung` auf Produkt UND Variante —
    blendet die Lieferarten pro Produkt/Variante ein oder aus.
    Kleinmengen-Varianten (1–4 kg) haben `expresslieferung = false`
    und sind damit nur bei Selbstabholung waehlbar.

## Wichtig

- Niemals direkt ins MAIN-Theme `187811070300` pushen
- Niemals Themes erzeugen oder publishen
- Test-Theme `188973449564` ist Eigentum dieses Repos. Wenn es
  im Shop-Admin geloescht wird, faellt der QA-Workflow aus
- Bei einem GitHub-Sync-Konflikt: das Sync-Theme `AMG_Tech_Shop/main`
  gewinnt fuer Live. Tests bleiben davon unberuehrt.
