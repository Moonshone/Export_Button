import { ExportButton } from './components/ExportButton'
import { sampleConversations } from './data/sampleChats'
import './styles.css'

function App() {
  const messageCount = sampleConversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  )

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Projekt-Grundgeruest</p>
        <h1 id="page-title">Lokaler Chat-Export</h1>
        <p className="intro">
          Dieser Prototyp erzeugt eine ZIP-Datei direkt im Browser. Es werden
          keine Chatdaten an einen Server gesendet.
        </p>
      </section>

      <section className="export-card" aria-labelledby="export-title">
        <div>
          <p className="eyebrow">Export</p>
          <h2 id="export-title">Chatdaten herunterladen</h2>
          <p>
            Aktuell werden {sampleConversations.length} Beispiel-Chat und{' '}
            {messageCount} Nachrichten exportiert.
          </p>
        </div>

        <ExportButton conversations={sampleConversations} />
      </section>

      <section className="next-steps" aria-labelledby="next-title">
        <h2 id="next-title">Naechste Ausbaustufen</h2>
        <ol>
          <li>Chats im Browser anlegen und in localStorage speichern.</li>
          <li>Exportdialog mit Dateivorschau ergaenzen.</li>
          <li>Optionalen Datenimport entwickeln.</li>
        </ol>
      </section>
    </main>
  )
}

export default App
