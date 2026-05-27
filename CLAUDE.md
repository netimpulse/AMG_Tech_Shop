# AMG Tech Shop — Repo-spezifische Anweisungen

## WICHTIG: Live-Theme Setup, kein separates QA-Theme

Dieses Repo ist GitHub-verbunden mit dem MAIN-Theme `AMG_Tech_Shop/main`
(Theme-ID `184912576838`) im Store `zjyfg5-ya.myshopify.com`.

Es gibt KEIN separates QA-Preview-Theme und KEIN dediziertes
QA-Block-Test-Template. Tests laufen direkt im Live-Theme.

**Konsequenz:** Jede CLI-Push-Operation veraendert kurzzeitig den live
sichtbaren Theme-Zustand. Daher ZWINGEND Backup-Restore-Workflow.

## Backup-Restore-Workflow (Pflicht bei jedem Section/Block-Build)

### Vor jedem Bauauftrag

```bash
# 1) Aktuellen Theme-Stand sichern (ohne den Repo-State zu beruehren)
mkdir -p .backup-theme
shopify theme pull -e development --path ./.backup-theme --nodelete
```

### Block-Entwicklung im Repo

```bash
# 2) Neue Section/Block in sections/ oder snippets/ schreiben
# 3) Block temporaer ins templates/index.json einbauen (Test auf Home)
#    Beispiel:
#    {
#      "sections": {
#        "qa_test_block": { "type": "neuer-block", "settings": { ... } },
#        ... bestehende sections ...
#      },
#      "order": ["qa_test_block", ... bestehender order ...]
#    }
```

### Test-Push und Visual-QA

```bash
# 4) Theme-Check
shopify theme check

# 5) Push ins LIVE-MAIN-Theme (mit --nodelete, damit nichts versehentlich geloescht wird)
shopify theme push -e development --nodelete

# 6) Playwright-Tests
npx playwright test
```

### Nach erfolgreichem Test — Restore

```bash
# 7a) Den hinzugefuegten Section-Eintrag aus templates/index.json wieder entfernen
#     (Order wieder auf den urspruenglichen Stand bringen)
# 7b) Push der bereinigten Files
shopify theme push -e development --nodelete

# 8) ODER, wenn unsicher: Backup komplett zurueckspielen
cp -r .backup-theme/* .
shopify theme push -e development --nodelete

# 9) Backup-Ordner aus dem Working-Dir loeschen
rm -rf .backup-theme
```

### Wenn Test rot ist

```bash
# 1) Sofort Backup zuruecksetzen
cp -r .backup-theme/* .
shopify theme push -e development --nodelete

# 2) Fehler im Code lokal fixen
# 3) Erst dann neuen Versuch ab Schritt "Test-Push"
```

## Was Claude in einer Session tun MUSS

1. Vor jedem Schreib-Zugriff auf das Theme: `shopify theme pull` ins .backup-theme
2. Block-Einbau ins index.json klar als temporaer markieren (Comment im JSON)
3. Nach jedem Test (egal ob gruen oder rot): Backup-Restore + Backup-Cleanup
4. Niemals einen Branch mit nicht-restoriertem Test-Block mergen
5. Vor `git push` pruefen: ist der Backup-Restore wirklich passiert?

## Was Claude NICHT tun darf

- Direktes Push ohne vorheriges Backup
- Neue Themes erzeugen (`shopify theme push --unpublished`)
- Neue Pages oder Templates im Admin anlegen
- Live-Sections (Header, Footer, Product) modifizieren ohne expliziten Auftrag
- Test-Block dauerhaft im index.json lassen
