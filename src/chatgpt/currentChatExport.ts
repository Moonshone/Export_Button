import JSZip from 'jszip'
import type { VisibleConversation } from './conversationReader'
import { sanitizeTitle } from './conversationReader'

const ROLE_LABELS = { user: 'Benutzer', assistant: 'Assistent', system: 'System', unknown: 'Unbekannt' } as const

export function createConversationJson(conversation: VisibleConversation, exportedAt: Date): string {
  return JSON.stringify({
    exportVersion: '1.0',
    source: 'chatgpt-visible-conversation',
    exportedAt: exportedAt.toISOString(),
    url: conversation.url,
    title: conversation.title,
    messageCount: conversation.messages.length,
    messages: conversation.messages,
  }, null, 2)
}

export function createConversationMarkdown(conversation: VisibleConversation, exportedAt: Date): string {
  const messages = conversation.messages.map(({ role, content }) => `## ${ROLE_LABELS[role]}\n\n${content}`).join('\n\n')
  return `# ${conversation.title}\n\nExportiert am: ${exportedAt.toISOString()}\n\n${messages}\n`
}

export function createCurrentChatFilename(title: string, date: Date): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`
  return `chatgpt-${sanitizeTitle(title)}-${stamp}.zip`
}

export async function createCurrentChatArchive(conversation: VisibleConversation, exportedAt = new Date()) {
  const zip = new JSZip()
  zip.file('conversation.json', createConversationJson(conversation, exportedAt))
  zip.file('conversation.md', createConversationMarkdown(conversation, exportedAt))
  zip.file('README.txt', [
    'Lokaler ChatGPT-Export', '',
    'Es wurde nur die aktuell sichtbare Unterhaltung exportiert.',
    'Der Export wurde vollständig lokal im Browser erstellt.',
    'Es wurden keine Daten an einen Server gesendet.',
    'Bilder und Anhänge sind möglicherweise nicht enthalten.',
    'Diese Erweiterung ist kein offizielles OpenAI-Produkt.',
  ].join('\n'))
  return { blob: await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' }), filename: createCurrentChatFilename(conversation.title, exportedAt) }
}
