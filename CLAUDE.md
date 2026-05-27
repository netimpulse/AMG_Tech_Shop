# AMG Tech Shop — Repo-spezifische Anweisungen

## Theme-Setup

| Theme | ID | Zweck |
|---|---|---|
| `AMG_Tech_Shop/main` | `184912576838` | MAIN/live, GitHub-synced. **Nicht direkt anfassen.** Wird automatisch via Sync aus dem main-Branch aktualisiert. |
| `Kopie von AMG_Tech_Shop/main` | `191479906630` | UNPUBLISHED, **Test-Target**. CLI-Pushes gehen ausschliesslich hierhin. Customer sehen das nie. |

## Workflow

Standard `shopify-visual-qa` Workflow gilt 1:1. Kein Sonderfall-Verhalten noetig.

Pro Section/Block-Auftrag:

1. Code schreiben (Section/Block in `sections/` oder `snippets/`)
2. Wenn der Block testbar gemacht werden soll: temporaeren Eintrag ins
   `templates/index.json` einbauen (oder eine andere existierende
   Template-Datei, falls passender)
3. `shopify theme push -e development --nodelete` → pusht ins Test-Theme `191479906630`
4. `npx playwright test` → laeuft gegen `/?preview_theme_id=191479906630`
5. Bei rotem Test: korrigieren, ab Schritt 3 wiederholen (max 3 Iterationen)
6. Bei gruenem Test: `git commit` + `git push`, PR an main
7. Beim PR-Review: pruefen, ob temporaere index.json-Eintraege rein sollen
   oder vor dem Merge entfernt werden

## Keine Pages im Admin anlegen

Tests laufen gegen die vorhandene Homepage `/`. Es wird KEINE neue QA-Page
im Shop-Admin angelegt. Falls Claude eine bessere Test-URL braucht, kann
er auf bereits vorhandene Pages ausweichen — siehe `QA.paths` in
`tests/fixtures.ts`.

## Wichtig

- **Niemals** direkt ins MAIN-Theme `184912576838` pushen
- **Niemals** Themes erzeugen oder publishen
- Test-Theme `191479906630` ist Eigentum dieses Repos — wenn es im
  Shop-Admin geloescht wird, faellt der QA-Workflow aus
- Bei einem GitHub-Sync-Konflikt: das Sync-Theme `AMG_Tech_Shop/main`
  gewinnt fuer Live. Tests bleiben davon unberuehrt.
