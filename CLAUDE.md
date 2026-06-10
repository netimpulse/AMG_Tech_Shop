# AMG Tech Shop — Repo-spezifische Anweisungen

## Theme-Setup

| Theme | ID | Zweck |
|---|---|---|
| `AMG_Tech_Shop/main` | `184912576838` | MAIN/live, GitHub-synced. Nicht direkt anfassen. Wird automatisch via Sync aus dem main-Branch aktualisiert. |
| `Test` | `191479906630` | UNPUBLISHED Test-Theme. CLI-Pushes gehen ausschliesslich hierhin. Customer sehen das nie. |

Das Test-Theme ist ein **freier Sandbox**: Claude kann darin beliebig
viele Sections, Blocks, Templates ein- oder umbauen, ohne danach
aufzuraeumen. Der Stand bleibt zwischen Sessions erhalten und wird
beim naechsten Test einfach ueberschrieben.

## Workflow

Standard `shopify-visual-qa` Workflow gilt 1:1.

Pro Section/Block-Auftrag:

1. Code schreiben (`sections/`, `snippets/`, `assets/`)
2. Wenn der Block auf einer Seite sichtbar werden soll, ins passende
   Template einbauen (z. B. `templates/index.json` fuer Home,
   `templates/product.json` fuer Produktseite)
3. `shopify theme push -e development --nodelete` → pusht ins Test-Theme
4. `npx playwright test` → laeuft gegen `/?preview_theme_id=191479906630`
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

- Produkt: `trockeneispellets-1-5-mm` (Template-Suffix `trockeneis` →
  `templates/product.trockeneis.json`, Section `sections/dry-ice-product.liquid`)
- Verpackungs-Option ("Mit Box" / "Eigene Box"): Preisreduktion bei
  eigener Box laeuft ueber echte Varianten-Preise (gilt im Checkout).
  Die Section erkennt die Option am Namen ("Verpackung" oder "Box").
- Metafields (namespace `custom`, boolean, leer = ja):
  - `selbstabholung` / `expresslieferung` auf Produkt UND Variante —
    blendet die Lieferarten pro Produkt/Variante ein oder aus.
    Kleinmengen-Varianten (1–4 kg) haben `expresslieferung = false`
    und sind damit nur bei Selbstabholung waehlbar.

## Wichtig

- Niemals direkt ins MAIN-Theme `184912576838` pushen
- Niemals Themes erzeugen oder publishen
- Test-Theme `191479906630` ist Eigentum dieses Repos. Wenn es
  im Shop-Admin geloescht wird, faellt der QA-Workflow aus
- Bei einem GitHub-Sync-Konflikt: das Sync-Theme `AMG_Tech_Shop/main`
  gewinnt fuer Live. Tests bleiben davon unberuehrt.
