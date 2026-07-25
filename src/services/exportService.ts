import JSZip from 'jszip'
import type { Conversation } from '../types/chat'

const APPLICATION_NAME = 'Lokaler Chat-Export'
const EXPORT_VERSION = '1.0'

export interface ExportArchive {
  blob: Blob
  filename: string
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function createExportFilename(date = new Date()): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `chat-export-${year}-${month}-${day}-${hours}-${minutes}.zip`
}

export async function createChatExport(
  conversations: Conversation[],
  exportedAt = new Date(),
): Promise<ExportArchive> {
  const zip = new JSZip()
  const exportedAtIso = exportedAt.toISOString()
  const messageCount = conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  )

  const conversationPayload = {
    exportVersion: EXPORT_VERSION,
    exportedAt: exportedAtIso,
    conversations,
  }

  const manifestPayload = {
    exportVersion: EXPORT_VERSION,
    exportedAt: exportedAtIso,
    applicationName: APPLICATION_NAME,
    conversationCount: conversations.length,
    messageCount,
    storageType: 'browser-localStorage',
    includedFiles: ['conversations.json', 'manifest.json', 'README.txt'],
  }

  zip.file('conversations.json', JSON.stringify(conversationPayload, null, 2))
  zip.file('manifest.json', JSON.stringify(manifestPayload, null, 2))
  zip.file(
    'README.txt',
    [
      'Lokaler Chat-Export',
      '',
      'Diese ZIP-Datei wurde vollstaendig im Browser erzeugt.',
      'conversations.json enthaelt die exportierten Unterhaltungen.',
      'manifest.json enthaelt technische Angaben zum Export.',
      'Dieser Prototyp importiert die Daten noch nicht automatisch.',
    ].join('\n'),
  )

  const blob = await zip.generateAsync({ type: 'blob' })

  return {
    blob,
    filename: createExportFilename(exportedAt),
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
