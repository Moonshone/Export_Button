import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { sampleConversations } from '../data/sampleChats'
import { createChatExport, createExportFilename } from './exportService'

describe('exportService', () => {
  it('erstellt einen sicheren Dateinamen', () => {
    const date = new Date(2026, 6, 26, 9, 5)

    expect(createExportFilename(date)).toBe('chat-export-2026-07-26-09-05.zip')
  })

  it('erstellt eine ZIP-Datei mit JSON und README', async () => {
    const archive = await createChatExport(
      sampleConversations,
      new Date('2026-07-26T12:00:00.000Z'),
    )
    const zip = await JSZip.loadAsync(archive.blob)
    const manifestText = await zip.file('manifest.json')?.async('string')

    expect(zip.file('conversations.json')).not.toBeNull()
    expect(zip.file('README.txt')).not.toBeNull()
    expect(manifestText).toBeDefined()

    const manifest = JSON.parse(manifestText ?? '{}') as {
      conversationCount: number
      messageCount: number
    }

    expect(manifest.conversationCount).toBe(1)
    expect(manifest.messageCount).toBe(2)
  })
})
