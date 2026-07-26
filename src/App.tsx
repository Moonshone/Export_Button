import { useEffect, useRef, useState } from 'react'
import { ExportButton } from './components/ExportButton'
import { loadConversations } from './services/storageService'
import type { Conversation } from './types/chat'
import './styles.css'

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadError, setLoadError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    void loadConversations()
      .then((stored) => {
        if (mounted.current) setConversations(stored)
      })
      .catch(() => {
        if (mounted.current) {
          setLoadError('Die gespeicherten Chats konnten nicht geladen werden.')
        }
      })

    return () => {
      mounted.current = false
    }
  }, [])

  const messageCount = conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  )

  return (
    <main className="popup-shell" aria-labelledby="popup-title">
      <header className="popup-header">
        <div className="logo" aria-hidden="true">↓</div>
        <div>
          <p className="eyebrow">Browser-Erweiterung</p>
          <h1 id="popup-title">Lokaler Chat-Export</h1>
        </div>
      </header>

      <dl className="statistics" aria-label="Gespeicherte Daten">
        <div><dt>Gespeicherte Chats</dt><dd>{conversations.length}</dd></div>
        <div><dt>Gespeicherte Nachrichten</dt><dd>{messageCount}</dd></div>
      </dl>

      <p className="local-note">
        <span aria-hidden="true">●</span>
        Alle Daten werden ausschließlich lokal in deinem Browser verarbeitet.
      </p>

      {loadError && <p className="status-error" role="alert">{loadError}</p>}
      <ExportButton conversations={conversations} disabled={Boolean(loadError)} />
    </main>
  )
}

export default App
