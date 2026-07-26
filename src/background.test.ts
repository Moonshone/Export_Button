import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleExtensionMessage } from './background'
import type { DownloadArchiveMessage, DownloadArchiveResponse } from './types/extensionMessages'

const message: DownloadArchiveMessage = {
  type: 'DOWNLOAD_ARCHIVE',
  filename: 'chatgpt-Sicher-2026-07-26-12-34.zip',
  mimeType: 'application/zip',
  base64: 'UEsDBA==',
}

async function dispatch(value: unknown): Promise<{ keepAlive: boolean | undefined; response: DownloadArchiveResponse | undefined }> {
  let response: DownloadArchiveResponse | undefined
  const keepAlive = handleExtensionMessage(value, {}, (value) => { response = value as DownloadArchiveResponse })
  await vi.waitFor(() => {
    if (keepAlive && response === undefined) throw new Error('Antwort steht noch aus')
  })
  return { keepAlive, response }
}

describe('Extension Service Worker', () => {
  beforeEach(() => {
    vi.mocked(chrome.downloads.download).mockReset().mockResolvedValue(42)
  })

  it('registriert den Manifest-V3-Listener', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(handleExtensionMessage)
  })

  it('startet einen lokalen ZIP-Download und antwortet mit der Download-ID', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await dispatch(message)
    expect(result).toEqual({ keepAlive: true, response: { ok: true, downloadId: 42 } })
    expect(chrome.downloads.download).toHaveBeenCalledOnce()
    expect(chrome.downloads.download).toHaveBeenCalledWith({
      url: `data:application/zip;base64,${message.base64}`,
      filename: message.filename,
      saveAs: true,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('ignoriert fremde Nachrichtentypen', async () => {
    expect(await dispatch({ type: 'UNRELATED' })).toEqual({ keepAlive: undefined, response: undefined })
    expect(chrome.downloads.download).not.toHaveBeenCalled()
  })

  it.each([
    { ...message, filename: '../unsicher.zip' },
    { ...message, mimeType: 'text/plain' },
    { ...message, base64: 'kein base64!' },
  ])('weist ungültige Nachrichten zurück', async (invalid) => {
    expect((await dispatch(invalid)).response).toEqual({ ok: false, error: 'Die Download-Anfrage ist ungültig.' })
    expect(chrome.downloads.download).not.toHaveBeenCalled()
  })

  it('gibt Downloadfehler ohne interne Details zurück', async () => {
    vi.mocked(chrome.downloads.download).mockRejectedValueOnce(new Error('interner Pfad'))
    expect((await dispatch(message)).response).toEqual({ ok: false, error: 'Der Download konnte nicht gestartet werden.' })
  })

  it('unterscheidet eine fehlende Download-Berechtigung', async () => {
    vi.mocked(chrome.downloads.download).mockRejectedValueOnce(new Error('Missing downloads permission'))
    expect((await dispatch(message)).response).toEqual({ ok: false, error: 'Die Download-Berechtigung fehlt.' })
  })
})
