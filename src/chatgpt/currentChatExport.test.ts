import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { createConversationJson, createConversationMarkdown, createCurrentChatArchive, createCurrentChatFilename } from './currentChatExport'
import type { VisibleConversation } from './conversationReader'

const conversation: VisibleConversation = {
  title: 'Titel: Test', url: 'https://chatgpt.com/c/123',
  messages: [
    { role: 'user', content: 'Frage mit Umlaut: Grüße 👋', position: 1, codeBlocks: [], fileReferences: [] },
    { role: 'assistant', content: 'Antwort 😄', position: 2, codeBlocks: [], fileReferences: [] },
  ],
}
const date = new Date('2026-07-26T12:34:00.000Z')

describe('aktuelles Chat-Exportformat', () => {
  it('erzeugt gültiges JSON mit korrekter Nachrichtenanzahl', () => {
    const parsed = JSON.parse(createConversationJson(conversation, date))
    expect(parsed).toMatchObject({ exportVersion: '1.0', source: 'chatgpt-visible-conversation', messageCount: 2 })
    expect(parsed.messages).toHaveLength(2)
  })

  it('erzeugt lesbares Markdown', () => {
    expect(createConversationMarkdown(conversation, date)).toContain('## Benutzer\n\nFrage mit Umlaut: Grüße 👋\n\n## Assistent\n\nAntwort 😄')
  })

  it('erzeugt die drei lokalen ZIP-Dateien und einen bereinigten Namen', async () => {
    const archive = await createCurrentChatArchive(conversation, date)
    const zip = await JSZip.loadAsync(archive.base64, { base64: true })
    expect(Object.keys(zip.files)).toEqual(['conversation.json', 'conversation.md', 'README.txt'])
    expect(archive.filename).toMatch(/^chatgpt-Titel- Test-2026-07-26-/)
    expect(createCurrentChatFilename('A/B', date)).not.toContain('/')
    const payload = JSON.parse(await zip.file('conversation.json')!.async('string'))
    expect(payload.messages).toEqual(conversation.messages)
    expect(await zip.file('conversation.md')!.async('string')).toContain('Grüße 👋')
  })
})
