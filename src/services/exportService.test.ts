import JSZip from 'jszip'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleConversations } from '../data/sampleChats'
import {
  createChatExport,
  createExportFilename,
  downloadArchive,
  sanitizeFilename,
} from './exportService'

describe('exportService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('erstellt einen sicheren Dateinamen', () => {
    const date = new Date(2026, 6, 26, 9, 5)

    expect(createExportFilename(date)).toBe('chat-export-2026-07-26-09-05.zip')
    expect(sanitizeFilename('chat:<export>?*.zip')).toBe('chat--export---.zip')
  })

  it('erstellt conversations.json und manifest.json vollständig', async () => {
    const archive = await createChatExport(
      sampleConversations,
      new Date('2026-07-26T12:00:00.000Z'),
    )
    const zip = await JSZip.loadAsync(archive.blob)
    const conversationsText = await zip.file('conversations.json')?.async('string')
    const manifestText = await zip.file('manifest.json')?.async('string')
    const readmeText = await zip.file('README.txt')?.async('string')

    expect(zip.file('conversations.json')).not.toBeNull()
    expect(zip.file('README.txt')).not.toBeNull()
    expect(archive.blob.type).toBe('application/zip')
    expect(conversationsText).toBeDefined()
    expect(manifestText).toBeDefined()
    expect(readmeText).toContain('keine Daten an einen Server übertragen')

    const conversations = JSON.parse(conversationsText ?? '{}')
    expect(conversations).toEqual({
      exportVersion: '1.0',
      exportedAt: '2026-07-26T12:00:00.000Z',
      conversations: sampleConversations,
    })
    expect(conversationsText).toContain('\n  "exportVersion"')

    expect(JSON.parse(manifestText ?? '{}')).toEqual({
      exportVersion: '1.0',
      exportedAt: '2026-07-26T12:00:00.000Z',
      applicationName: 'Lokaler Chat-Export',
      conversationCount: 1,
      messageCount: 2,
      storageType: 'chrome.storage.local',
      includedFiles: ['conversations.json', 'manifest.json', 'README.txt'],
    })
  })

  it('startet den Download über chrome.downloads.download', async () => {
    const archive = { blob: new Blob(['zip']), filename: 'chat-export.zip' }
    await expect(downloadArchive(archive)).resolves.toBe(1)
    expect(chrome.downloads.download).toHaveBeenCalledWith({
      url: 'blob:test', filename: 'chat-export.zip', saveAs: true,
    })
  })

  it('übersetzt einen Fehler der Download-API verständlich', async () => {
    vi.mocked(chrome.downloads.download).mockRejectedValueOnce(new Error('intern'))
    await expect(downloadArchive({ blob: new Blob(), filename: 'chat-export.zip' }))
      .rejects.toThrow('Download konnte nicht gestartet werden')
  })

  it('unterstützt eine leere Chatliste', async () => {
    const archive = await createChatExport([], new Date('2026-07-26T12:00:00.000Z'))
    const zip = await JSZip.loadAsync(archive.blob)
    const conversations = JSON.parse(await zip.file('conversations.json')!.async('string'))
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))

    expect(conversations.conversations).toEqual([])
    expect(manifest.conversationCount).toBe(0)
    expect(manifest.messageCount).toBe(0)
  })

  it('erhält Umlaute, Emojis, Zeilenumbrüche und Codeblöcke unverändert', async () => {
    const original = structuredClone(sampleConversations)
    original[0].title = 'Grüße 👋'
    original[0].messages[0].content = 'Zeile eins\nZeile zwei 😄\n```ts\nconst grüße = true\n```'
    const before = structuredClone(original)
    const archive = await createChatExport(original)
    const zip = await JSZip.loadAsync(archive.blob)
    const payload = JSON.parse(await zip.file('conversations.json')!.async('string'))

    expect(payload.conversations).toEqual(original)
    expect(payload.conversations[0].messages[0].content).toContain('grüße = true')
    expect(original).toEqual(before)
  })
})
