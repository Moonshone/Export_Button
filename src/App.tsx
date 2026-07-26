import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Conversation, MessageRole } from './types/chat'
import {
  createConversation,
  deleteConversation,
  loadConversations,
  updateConversation,
} from './services/storageService'
import './styles.css'
import { ExportButton } from './components/ExportButton'

function newId() {
  return crypto.randomUUID()
}

function MessageText({ content }: { content: string }) {
  const parts = content.split(/```/)
  return (
    <div className="message-text">
      {parts.map((part, index) =>
        index % 2 ? <pre key={index}><code>{part.replace(/^\w*\n/, '')}</code></pre> : <span key={index}>{part}</span>,
      )}
    </div>
  )
}

function App() {
  const [chats, setChats] = useState<Conversation[]>(loadConversations)
  const [selectedId, setSelectedId] = useState<string | null>(() => chats[0]?.id ?? null)
  const [message, setMessage] = useState('')
  const [role, setRole] = useState<MessageRole>('user')
  const [isRenaming, setIsRenaming] = useState(false)
  const [title, setTitle] = useState('')
  const selected = chats.find((chat) => chat.id === selectedId)

  function addChat() {
    const created = createConversation('Neuer Chat')
    setChats((current) => [...current, created])
    setSelectedId(created.id)
  }

  function addMessage(event: FormEvent) {
    event.preventDefault()
    if (!selected || !message.trim()) return
    const updated = updateConversation(selected.id, {
      messages: [...selected.messages, { id: newId(), role, content: message.trim(), createdAt: new Date().toISOString() }],
    })
    setChats((current) => current.map((chat) => chat.id === updated.id ? updated : chat))
    setMessage('')
  }

  function rename(event: FormEvent) {
    event.preventDefault()
    if (!selected || !title.trim()) return
    const updated = updateConversation(selected.id, { title: title.trim() })
    setChats((current) => current.map((chat) => chat.id === updated.id ? updated : chat))
    setIsRenaming(false)
  }

  function removeChat() {
    if (!selected || !window.confirm(`Chat „${selected.title}“ wirklich löschen?`)) return
    deleteConversation(selected.id)
    const remaining = chats.filter((chat) => chat.id !== selected.id)
    setChats(remaining)
    setSelectedId(remaining[0]?.id ?? null)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Chat-Navigation">
        <div className="brand"><span aria-hidden="true">◈</span><strong>Lokale Chats</strong></div>
        <button className="primary new-chat" onClick={addChat}>＋ Neuer Chat</button>
        <nav aria-label="Chatliste">
          <ul className="chat-list">
            {chats.map((chat) => <li key={chat.id}><button className={chat.id === selectedId ? 'active' : ''} aria-current={chat.id === selectedId ? 'page' : undefined} onClick={() => setSelectedId(chat.id)}><span>{chat.title}</span><small>{chat.messages.length} Nachrichten</small></button></li>)}
          </ul>
        </nav>
        <p className="local-note">🔒 Alle Daten werden ausschließlich lokal in diesem Browser gespeichert.</p>
        <ExportButton conversations={chats} />
      </aside>

      <section className="chat-panel" aria-live="polite">
        {selected ? <>
          <header className="chat-header">
            <div>
              <p className="eyebrow">Ausgewählter Chat</p>
              {isRenaming ? <form className="rename-form" onSubmit={rename}><label htmlFor="chat-title" className="sr-only">Chatname</label><input id="chat-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /><button className="primary">Speichern</button><button type="button" onClick={() => setIsRenaming(false)}>Abbrechen</button></form> : <h1>{selected.title}</h1>}
            </div>
            <div className="header-actions"><button onClick={() => { setTitle(selected.title); setIsRenaming(true) }} aria-label="Chat umbenennen">✎ Umbenennen</button><button className="danger" onClick={removeChat} aria-label="Chat löschen">⌫ Löschen</button></div>
          </header>

          <div className="messages" aria-label="Nachrichtenverlauf">
            {selected.messages.length === 0 && <p className="empty">Noch keine Nachrichten. Füge unten die erste Nachricht hinzu.</p>}
            {selected.messages.map((item) => <article className={`message ${item.role}`} key={item.id} aria-label={item.role === 'user' ? 'Nachricht von Benutzer' : 'Nachricht von Assistent'}><strong>{item.role === 'user' ? 'Benutzer' : 'Assistent'}</strong><MessageText content={item.content} /></article>)}
          </div>

          <form className="composer" onSubmit={addMessage}>
            <label htmlFor="message">Nachricht</label>
            <textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nachricht eingeben …" />
            <div className="composer-actions"><label htmlFor="role">Rolle</label><select id="role" value={role} onChange={(e) => setRole(e.target.value as MessageRole)}><option value="user">Benutzer</option><option value="assistant">Assistent</option></select><button className="primary" disabled={!message.trim()}>Nachricht hinzufügen</button></div>
            <p className="helper">Es werden keine Nachrichten an eine KI oder einen Server gesendet.</p>
          </form>
        </> : <div className="welcome"><span aria-hidden="true">◈</span><h1>Deine lokalen Chats</h1><p>Erstelle einen Chat, um Nachrichten ausschließlich in deinem Browser zu speichern.</p><button className="primary" onClick={addChat}>Neuen Chat erstellen</button></div>}
      </section>
    </main>
  )
}

export default App
