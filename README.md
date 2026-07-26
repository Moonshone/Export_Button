# Lokaler ChatGPT-Export – Browser-Erweiterung

Installierbare Manifest-V3-Erweiterung für Chrome und Edge mit zwei lokalen Exportmodi: **Aktuellen Chat exportieren** und – auf zuverlässig erkannten Projektseiten – **Ganzes Projekt exportieren**. JSZip erzeugt sämtliche Archive ausschließlich im Browser.

## Entwicklung

```bash
npm install
npm run lint
npm run test:run
npm run test:coverage
npm run build
npm run test:build
```

## Installation

### Chrome
1. `npm run build` ausführen.
2. `chrome://extensions` öffnen und den Entwicklermodus aktivieren.
3. **Entpackte Erweiterung laden** wählen und `dist/` auswählen.

### Edge
1. `npm run build` ausführen.
2. `edge://extensions` öffnen und den Entwicklermodus aktivieren.
3. **Entpackte Erweiterung laden** wählen und `dist/` auswählen.

## Aktueller Chat

Der Seitenbutton liest ausschließlich die aktuell sichtbare Unterhaltung aus dem zugänglichen DOM. Das ZIP enthält `conversation.json`, `conversation.md` und `README.txt`. Der bestehende Popup-Export für Daten im Erweiterungsspeicher bleibt getrennt verfügbar.

## Ganzes Projekt

Auf einer erkannten Projektseite zeigt die Erweiterung einen zweiten Button. Ein zugänglicher Bestätigungsdialog nennt Projekt, Chat- und Dateianzahl und bietet Optionen. Danach öffnet der Service Worker immer nur einen Projektchat in einem inaktiven Tab, liest den sichtbaren Inhalt und schließt den Tab vor dem nächsten Chat. Fehler werden einmal wiederholt. **Export abbrechen** schließt temporäre Tabs und verhindert den Download.

```text
README.txt
manifest.json
project.json
errors.json                           # nur bei Warnungen/Fehlern
instructions/project-instructions.md # nur bei sichtbaren Anweisungen
chats/001-Titel/conversation.json
chats/001-Titel/conversation.md
files/index.json
files/README.txt
```

Identische Chattitel erhalten eindeutige Ordner. `complete` ist nur `true`, wenn alle ausgewählten, entdeckten Inhalte enthalten sind. Teilfehler und fehlende Dateien werden ehrlich dokumentiert. Dateien, deren Download interne Endpunkte oder nicht zugängliche Anmeldedaten voraussetzt, werden nur als sichtbarer Verweis aufgenommen.

## Toasts und Fortschritt

Status, Erfolg und Fehler erscheinen als zugängliche Toasts; Buttontexte bleiben fest. Die automatische Dauer ist `3000 + Zeichenanzahl × 45 ms`, mindestens 3 und höchstens 15 Sekunden. Fortschritts-Toasts bleiben sichtbar und werden pro Export aktualisiert. Maximal drei Toasts sind gleichzeitig sichtbar; weitere warten. Fehler verwenden `role="alert"`, andere Meldungen `role="status"`.

## Berechtigungen

- `downloads`: speichert das lokal erzeugte ZIP.
- `storage`: bleibt für den bestehenden lokalen Popup-Export erforderlich.
- `tabs`: öffnet und schließt sequenziell einen inaktiven Projektchat-Tab.
- `https://chatgpt.com/*`: enges Hostrecht für Content Script und Tabkommunikation; `<all_urls>` wird nicht verwendet.

## Datenschutz

Die Erweiterung nutzt keine internen OpenAI-APIs, Cookies, Tokens, React-Interna, ChatGPT-`localStorage`, ChatGPT-`sessionStorage`, externen Server, Analyse oder Tracking. Sie ruft für Chatinhalte weder `fetch` noch `XMLHttpRequest` auf und protokolliert keine Chatinhalte. Exportdaten entstehen lokal im Browser.

## Bekannte Grenzen

- ChatGPT kann DOM und Selektoren ändern.
- Nur sichtbare oder durch begrenztes Scrollen normal nachladbare Projektchats werden entdeckt; das Limit beträgt 500.
- Projektanweisungen werden nur aus bereits zugänglichem DOM gelesen.
- Nicht normal herunterladbare Dateien fehlen als Binärinhalt.
- Ein vom Browser unerwartet beendeter Manifest-V3-Service-Worker kann den Export nicht aus gespeicherten Chatinhalten fortsetzen.

## Manuelle Prüfung

1. Normalen `/c/...`-Chat öffnen: nur Einzelchat-Button, unverändertes ZIP.
2. Projekt öffnen: Name erkannt und Projektbutton sichtbar.
3. Dialog mit Maus, Tabulator und Escape prüfen; Fokus kehrt zurück.
4. Mehrere Chats exportieren und sequenzielle inaktive Tabs beobachten.
5. Fortschritts-, Erfolgs- und Teilfehler-Toasts prüfen.
6. Abbrechen: Tabs schließen, kein Download.
7. ZIP-Struktur, Nummerierung, UTF-8, `errors.json` und `complete` prüfen.
8. Doppelklick: kein doppelter Export oder Download.
9. SPA-Navigation: keine doppelten Buttons.
10. Toasts im hellen und dunklen Farbschema prüfen.

Diese Erweiterung ist kein offizielles OpenAI-Produkt.

## Strukturierter Export benutzerdefinierter GPTs

Der einzige kontextabhängige Button exportiert weiterhin einzelne Chats und Projektübersichten. Auf einer öffentlichen/geteilten GPT-Detailseite oder im Editor lautet er **„GPT exportieren“**; eine Unterhaltung mit einem GPT bleibt dagegen ein normaler Chat-Export.

Vor dem Export zeigt ein barrierefreier Bestätigungsdialog die sichtbaren Inhalte und Optionen. Das lokal erzeugte ZIP enthält `gpt.json`, `manifest.json` und `README.txt` sowie – sofern vorhanden und ausgewählt – Anweisungen, Gesprächseinstiege, Wissensdateiverweise, Fähigkeiten, Apps, Aktionen, sichtbare redigierte OpenAPI-Schemas und einen Profilbildverweis. Tatsächliche Wissensdateien und Profilbilder sind standardmäßig deaktiviert. Nicht zugängliche Inhalte werden in `warnings.json` dokumentiert.

Aktionsdaten werden rekursiv redigiert; API-Schlüssel, Tokens, Autorisierungswerte, Passwörter, Cookies, Client-Secrets und private Schlüssel werden nie exportiert. Die Erweiterung liest ausschließlich sichtbare DOM-Inhalte, nutzt keine internen ChatGPT-APIs oder Speicher und sendet keine Exportdaten an externe Server. Öffentliche Detailseitenexporte enthalten niemals erfundene interne Anweisungen oder Wissensdateien und sind ausdrücklich als teilweise gekennzeichnet.

Projekt- und GPT-Exporte können über denselben Button abgebrochen werden. Persistente Fortschritts-Toasts werden während Analyse, Paketierung und Download aktualisiert.

### Bekannte Grenzen

ChatGPT kann seine Oberfläche und Routen ändern. Nicht sichtbare Bereiche sowie Dateien ohne normale sichtbare Downloadmöglichkeit werden ausgelassen. Die Erweiterung verändert, speichert oder veröffentlicht keine GPT-Konfiguration.

### Lokale Installation

1. `npm install` und `npm run build` ausführen.
2. In Chrome `chrome://extensions` bzw. in Edge `edge://extensions` öffnen.
3. Entwicklermodus aktivieren, **Entpackte Erweiterung laden** wählen und den Ordner `dist` auswählen.

**Diese Erweiterung ist kein offizielles OpenAI-Produkt.**
