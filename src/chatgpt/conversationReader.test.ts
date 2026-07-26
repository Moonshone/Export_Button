import { readVisibleConversation, sanitizeTitle } from './conversationReader'
import { describe, expect, it } from 'vitest'

function renderConversation(): void {
  document.body.innerHTML = `
    <aside><div data-message-author-role="user">Andere Unterhaltung</div></aside>
    <main>
      <h1>Mein Testchat</h1>
      <article data-message-author-role="user"><p>Erste Zeile<br>Zweite Zeile</p><button>Kopieren</button></article>
      <article data-message-author-role="assistant"><p>Hier ist Code:</p><pre><code>const answer = 42;\nconsole.log(answer)</code></pre><button>Vorlesen</button></article>
      <article data-message-author-role="assistant" hidden>Versteckt</article>
    </main>`
}

describe('ChatGPT-Unterhaltung aus dem DOM lesen', () => {
  it('erkennt Benutzer und Assistent in richtiger Reihenfolge ohne Seitenleiste', () => {
    renderConversation()
    const result = readVisibleConversation()
    expect(result.messages).toEqual([
      { role: 'user', content: 'Erste Zeile\nZweite Zeile', position: 1, codeBlocks: [], fileReferences: [] },
      { role: 'assistant', content: 'Hier ist Code:\n\nconst answer = 42;\nconsole.log(answer)', position: 2, codeBlocks: ['const answer = 42;\nconsole.log(answer)'], fileReferences: [] },
    ])
    expect(result.title).toBe('Mein Testchat')
    expect(result.messages.map(({ content }) => content).join()).not.toContain('Andere Unterhaltung')
    expect(result.messages.map(({ content }) => content).join()).not.toContain('Kopieren')
  })

  it('behandelt eine leere Unterhaltung korrekt', () => {
    document.body.innerHTML = '<main></main>'
    expect(readVisibleConversation().messages).toEqual([])
  })

  it('bereinigt unzulässige Dateinamenzeichen', () => {
    expect(sanitizeTitle(' Test: <Chat>?* ')).toBe('Test- -Chat---')
    expect(sanitizeTitle('***')).toBe('---')
  })
})
