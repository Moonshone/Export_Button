# Projektregeln fuer Codex

## Ziel
Dieses Projekt entwickelt einen lokalen Export-Button fuer eigene Chatdaten.

## Technische Regeln
- React und TypeScript verwenden.
- Kein Backend hinzufuegen, solange es nicht ausdruecklich beauftragt wird.
- Exportdaten ausschliesslich im Browser erzeugen.
- Keine API-Schluessel oder Zugangsdaten speichern.
- Barrierefreie Bedienung und deutsche Oberflaechentexte beibehalten.
- Neue Funktionen mit Tests absichern.

## Qualitaetspruefung
Vor einem Commit ausfuehren:

```bash
npm run lint
npm test
npm run build
```
