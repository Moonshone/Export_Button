import JSZip from 'jszip'
import type { Conversation } from '../types/chat'

const APPLICATION_NAME = 'Lokaler Chat-Export'
const EXPORT_VERSION = '1.0'

export interface ExportArchive {
  blob: Blob
  filename: string
}

export class DownloadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DownloadError'
  }
}

export class ChatExportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ChatExportError'
  }
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function sanitizeFilename(filename: string): string {
  const withoutControlCharacters = Array.from(filename, (character) =>
    character.charCodeAt(0) <= 31 ? '-' : character,
  ).join('')
  const sanitized = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')

  return sanitized || 'chat-export.zip'
}

export function createExportFilename(date = new Date()): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return sanitizeFilename(
    `chat-export-${year}-${month}-${day}-${hours}-${minutes}.zip`,
  )
}

export async function createChatExport(
  conversations: Conversation[],
  exportedAt = new Date(),
): Promise<ExportArchive> {
  try {
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
      storageType: 'chrome.storage.local',
      includedFiles: ['conversations.json', 'manifest.json', 'README.txt'],
    }

    zip.file('conversations.json', JSON.stringify(conversationPayload, null, 2))
    zip.file('manifest.json', JSON.stringify(manifestPayload, null, 2))
    zip.file(
      'README.txt',
      [
        'Lokaler Chat-Export',
        '',
        'Diese ZIP-Datei wurde vollständig lokal im Browser erzeugt.',
        'conversations.json enthält die exportierten Chats.',
        'manifest.json enthält technische Angaben zum Export.',
        'Es wurden keine Daten an einen Server übertragen.',
      ].join('\n'),
    )

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/zip',
    })

    return {
      blob,
      filename: createExportFilename(exportedAt),
    }
  } catch (error) {
    throw new ChatExportError(
      'Die ZIP-Datei konnte nicht lokal erstellt werden. Bitte versuche es erneut.',
      { cause: error },
    )
  }
}

export async function downloadArchive(archive: ExportArchive): Promise<number> {
  if (typeof chrome === 'undefined' || !chrome.downloads?.download) {
    throw new DownloadError('Die Download-Funktion der Erweiterung ist nicht verfügbar.')
  }

  const url = URL.createObjectURL(archive.blob)
  try {
    return await chrome.downloads.download({
      url,
      filename: archive.filename,
      saveAs: true,
    })
  } catch (error) {
    throw new DownloadError('Der Download konnte nicht gestartet werden.', { cause: error })
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
