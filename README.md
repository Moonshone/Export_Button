# Lokaler Chat-Export – Browser-Erweiterung

Installierbare Manifest-V3-Erweiterung für Google Chrome und Microsoft Edge.
Das React-/TypeScript-Popup liest eigene Chatdaten aus `chrome.storage.local`
und exportiert sie mit JSZip vollständig lokal. Es gibt kein Backend, keine
Netzwerkanfragen, keine Cloud-Speicherung und keinen Zugriff auf ChatGPT.

## Entwicklung

```bash
npm install
npm run lint
npm run test:run
npm run build
```

Der Build erzeugt in `dist/` einen direkt ladbaren Erweiterungsordner mit
`manifest.json`, `popup.html`, den gebündelten Assets und den Icons. Vite lädt
keine externen Skripte oder CDN-Ressourcen.

## Lokale Installation in Chrome

1. `npm run build` ausführen.
2. `chrome://extensions` öffnen.
3. **Entwicklermodus** aktivieren.
4. **Entpackte Erweiterung laden** wählen.
5. Den Ordner `dist/` auswählen und die Erweiterung bei Bedarf anheften.

## Lokale Installation in Edge

1. `npm run build` ausführen.
2. `edge://extensions` öffnen.
3. **Entwicklermodus** aktivieren.
4. **Entpackte Erweiterung laden** wählen.
5. Den Ordner `dist/` auswählen und die Erweiterung bei Bedarf anheften.

## Datenspeicherung und Export

Unterhaltungen liegen unter dem Schlüssel `conversations` in
`chrome.storage.local`. Der abstrahierte Storage-Service lädt, speichert und
löscht ausschließlich diesen Schlüssel. Das ZIP-Archiv enthält:

- `conversations.json`
- `manifest.json`
- `README.txt`

Der Download wird über `chrome.downloads.download()` gestartet und heißt
`chat-export-JJJJ-MM-TT-HH-mm.zip`.

## Bekannte Einschränkungen

- Die Erweiterung erfasst keine Chats von Webseiten und enthält bewusst kein
  Content Script sowie keine Host-Berechtigungen.
- Daten werden nicht zwischen Browsern, Profilen oder Geräten übertragen.
- Es gibt derzeit keinen Import und keine eigene Oberfläche zum Anlegen von
  Chats; das Popup exportiert Daten, die andere lokale Erweiterungsfunktionen
  unter dem dokumentierten Storage-Schlüssel abgelegt haben.
- Entfernen der Erweiterung oder Löschen ihrer Browserdaten kann gespeicherte
  Chats dauerhaft löschen.
