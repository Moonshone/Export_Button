# Export Button

Grundgeruest fuer eine lokale React-Anwendung, die Chatdaten direkt im Browser als ZIP-Datei exportiert.

## Enthalten

- React mit TypeScript und Vite
- lokaler ZIP-Export mit JSZip
- Beispiel-Datenmodell fuer Chats und Nachrichten
- barrierearmer Export-Button mit Statusmeldungen
- Tests mit Vitest und Testing Library
- ESLint und TypeScript-Pruefung

## Installation

```bash
npm install
```

## Entwicklung starten

```bash
npm run dev
```

Vite zeigt danach eine lokale Adresse, normalerweise `http://localhost:5173`.

## Tests und Build

```bash
npm run lint
npm test
npm run build
```

## Lokaler Export

Der aktuelle Prototyp exportiert Beispiel-Chats als ZIP-Datei. Die ZIP-Datei enthaelt:

- `conversations.json`
- `manifest.json`
- `README.txt`

Die Datei wird vollstaendig im Browser erzeugt. Es werden keine Chatdaten an einen Server gesendet.

## Naechste Schritte

1. Chatdaten in `localStorage` speichern.
2. Chat-Oberflaeche ergaenzen.
3. Importfunktion entwickeln.
4. Optional einen Speichern-unter-Dialog fuer unterstuetzte Browser anbieten.
