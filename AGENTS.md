# Projektregeln fuer Codex

## Ziel
Dieses Projekt entwickelt einen lokalen Export-Button fuer eigene Chatdaten.

## Technische Regeln
- React und TypeScript verwenden.
- TypeScript strikt verwenden.
- Keine Backend-Abhaengigkeiten hinzufuegen.
- Keine Cloud-Speicherung verwenden.
- Keine API-Schluessel oder Zugangsdaten speichern.
- Der Export muss vollstaendig lokal bleiben und Exportdaten duerfen ausschliesslich im Browser erzeugt werden.
- Barrierefreie Bedienung und deutsche Oberflaechentexte beibehalten.
- Neue Funktionen mit Tests absichern.
- Keine Aenderungen ausserhalb des beauftragten Umfangs vornehmen.

## Qualitaetspruefung
Tests und Qualitaetspruefungen vor jedem Commit ausfuehren:

```bash
npm run lint
npm test
npm run build
```
