# Export Button

## Projektbeschreibung

Export Button ist eine lokale React-Anwendung zum Anlegen, Bearbeiten und
Exportieren eigener Chatverläufe. Chats und Nachrichten verbleiben im Browser
und können als ZIP-Archiv gesichert werden. Die Anwendung besitzt kein Backend
und überträgt keine Chat- oder Exportdaten an einen Server.

## Verwendete Technologien

- React 19 und TypeScript im strikten Modus
- Vite als Entwicklungsserver und Build-Werkzeug
- JSZip zur lokalen Erzeugung des ZIP-Archivs
- Vitest, Testing Library und jsdom für automatisierte Tests
- ESLint zur statischen Codeprüfung
- Browser-APIs wie `localStorage`, `Blob` und die Download-API

## Installation

Voraussetzung ist eine aktuelle Node.js-Version mit npm. Installiere die
Abhängigkeiten im Projektverzeichnis:

```bash
npm install
```

## Entwicklung starten

```bash
npm run dev
```

Vite gibt anschließend die lokale Adresse der Anwendung aus, üblicherweise
`http://localhost:5173`.

## Tests

```bash
npm test
```

Die Tests werden einmalig mit Vitest ausgeführt. Für die Entwicklung steht
zusätzlich `npm run test:watch` zur Verfügung.

## Produktions-Build

```bash
npm run build
```

Dieser Befehl prüft TypeScript und erzeugt die auslieferbaren Dateien im
Verzeichnis `dist/`.

## Lokale Datenspeicherung mit `localStorage`

Die Anwendung speichert die vollständige Liste der Unterhaltungen als JSON im
Web Storage des Browsers. Dafür wird der Schlüssel
`lokaler-chat-export:conversations:v1` verwendet. `localStorage` bewahrt Daten
über Seitenaufrufe und Browser-Neustarts hinweg auf, solange sie nicht durch die
Anwendung, den Browser oder den Benutzer gelöscht werden.

`localStorage` ist **browser-, profil- und ursprungsabhängig**: Daten aus einem
Browserprofil sind nicht automatisch in einem anderen Profil oder Browser
verfügbar. Auch eine andere Adresse, ein anderer Port oder der private Modus
kann einen getrennten Speicher verwenden. Der ZIP-Export eignet sich deshalb
als manuell herunterladbare Sicherung.

### Lokale Daten löschen

Die Daten können über die Website-Einstellungen beziehungsweise die
Entwicklerwerkzeuge des Browsers gelöscht werden:

1. Die Anwendung im Browser öffnen.
2. Die Entwicklerwerkzeuge öffnen und zum Bereich **Application** bzw.
   **Speicher** wechseln.
3. Unter **Local Storage** den Ursprung der Anwendung auswählen.
4. Den Eintrag `lokaler-chat-export:conversations:v1` löschen oder den lokalen
   Speicher für diesen Ursprung vollständig leeren.
5. Die Seite neu laden.

Einzelne Chats können außerdem über **Löschen** in der Oberfläche entfernt
werden. Das Löschen von Browserdaten, das Zurücksetzen des Profils oder das
Deinstallieren des Browsers kann ebenfalls sämtliche lokalen Chats entfernen.

## ZIP-Export

Über **Daten exportieren** und anschließend **ZIP-Datei erstellen** erzeugt
JSZip das Archiv vollständig im Arbeitsspeicher des Browsers. Danach startet
der Browser den Download einer Datei nach dem Muster
`chat-export-JJJJ-MM-TT-HH-MM.zip`. Es findet weder bei der Speicherung noch
beim Export eine Übertragung an einen Server oder Cloud-Dienst statt.

Das Archiv enthält drei Dateien:

- `conversations.json`: die eigentlichen Chatdaten
- `manifest.json`: technische Metadaten zum Export
- `README.txt`: eine kurze Erläuterung des Archivs

### Inhalt von `conversations.json`

Die Datei enthält:

- `exportVersion`: Version des Exportformats
- `exportedAt`: Exportzeitpunkt als ISO-8601-Zeitstempel
- `conversations`: Liste aller Unterhaltungen

Jede Unterhaltung besitzt `id`, `title`, `createdAt`, `updatedAt` und ein
`messages`-Array. Jede Nachricht enthält `id`, `role` (`user` oder
`assistant`), `content` und `createdAt`. Datumswerte werden als
ISO-8601-Zeitstempel ausgegeben.

### Inhalt von `manifest.json`

Das Manifest beschreibt den Export mit folgenden Feldern:

- `exportVersion` und `exportedAt`
- `applicationName`
- `conversationCount`: Anzahl der exportierten Chats
- `messageCount`: Gesamtzahl der exportierten Nachrichten
- `storageType`: verwendete lokale Speicherart (`browser-localStorage`)
- `includedFiles`: Liste der Dateien im ZIP-Archiv

## Bekannte Einschränkungen

- Daten werden nicht zwischen Browsern, Profilen oder Geräten synchronisiert.
- Es gibt keine Cloud-Sicherung und keine automatische Wiederherstellung.
- Browser-Einstellungen, privates Surfen oder Speicherbereinigung können die
  Verfügbarkeit und Dauerhaftigkeit von `localStorage` einschränken.
- Die mögliche Datenmenge ist durch das `localStorage`-Kontingent des Browsers
  begrenzt; sehr große oder sehr viele Chats können nicht gespeichert werden.
- Das ZIP-Archiv kann derzeit exportiert, aber nicht wieder in die Anwendung
  importiert werden.
- Es werden nur Textnachrichten mit den Rollen Benutzer und Assistent verwaltet;
  Anhänge und weitere Rollen sind nicht vorgesehen.

## Projektstruktur

```text
.
├── src/
│   ├── components/       # Wiederverwendbare UI-Komponenten, insbesondere ExportButton
│   ├── data/             # Beispieldaten
│   ├── services/         # localStorage- und ZIP-Export-Logik
│   ├── test/             # Gemeinsame Testkonfiguration
│   ├── types/            # TypeScript-Datenmodelle
│   ├── App.tsx           # Chat-Oberfläche und Anwendungslogik
│   ├── App.test.tsx      # Oberflächentests
│   ├── main.tsx          # Einstiegspunkt
│   └── styles.css        # Globale Gestaltung
├── index.html            # HTML-Einstieg für Vite
├── package.json          # Abhängigkeiten und npm-Skripte
├── tsconfig*.json        # TypeScript-Konfiguration
└── vite.config.ts        # Vite- und Vitest-Konfiguration
```

Weitere Tests liegen jeweils neben den zugehörigen Komponenten und Services.
