# Lokaler Chat-Export – Browser-Erweiterung

Installierbare Manifest-V3-Erweiterung für Google Chrome und Microsoft Edge.
Das React-/TypeScript-Content-Script ergänzt auf `https://chatgpt.com/` einen
Button, der ausschließlich die aktuell geöffnete, im DOM sichtbare Unterhaltung
mit JSZip exportiert. Das vorhandene Popup bleibt verfügbar.

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

## Datenschutz und aktueller Chat-Export

Der Export wird ausschließlich im Browser erzeugt. Die Erweiterung sendet keine
Nachrichten an Server, verwendet weder Analyse noch Tracking und liest keine
Cookies, Authentifizierungstokens, `localStorage`- oder `sessionStorage`-Daten
von ChatGPT. Sie ruft keine internen OpenAI-APIs auf, durchsucht nicht die
Chat-Historie und speichert keine ChatGPT-Zugangsdaten. Das Content Script darf
nur Inhalte auf `https://chatgpt.com/*` lesen; `<all_urls>` wird nicht verwendet.

Das ZIP des Seitenbuttons enthält `conversation.json`, `conversation.md` und
`README.txt`. Bilder, Anhänge sowie nicht sichtbare Inhalte können fehlen. Die
Erweiterung ist kein offizielles OpenAI-Produkt.

## Bestehender Popup-Export

Unterhaltungen liegen unter dem Schlüssel `conversations` in
`chrome.storage.local`. Der abstrahierte Storage-Service lädt, speichert und
löscht ausschließlich diesen Schlüssel. Das ZIP-Archiv enthält:

- `conversations.json`
- `manifest.json`
- `README.txt`

Der Download wird über `chrome.downloads.download()` gestartet und heißt
`chat-export-JJJJ-MM-TT-HH-mm.zip`.

## Bekannte Einschränkungen

- ChatGPT kann sein DOM jederzeit ändern; alle ChatGPT-Selektoren sind deshalb
  zentral gekapselt, müssen bei Änderungen der Seite aber eventuell angepasst werden.
- Exportiert wird sichtbarer Text. Bilder, Anhänge und manche Formatierungen
  sind möglicherweise nicht enthalten.
- Daten werden nicht zwischen Browsern, Profilen oder Geräten übertragen.
- Es gibt derzeit keinen Import und keine eigene Oberfläche zum Anlegen von
  Chats; das Popup exportiert Daten, die andere lokale Erweiterungsfunktionen
  unter dem dokumentierten Storage-Schlüssel abgelegt haben.
- Entfernen der Erweiterung oder Löschen ihrer Browserdaten kann gespeicherte
  Chats dauerhaft löschen.
