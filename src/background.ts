import { isDownloadArchiveMessage, type DownloadArchiveResponse } from './types/extensionMessages'

function isSafeZipFilename(filename: string): boolean {
  const hasControlCharacter = Array.from(filename).some((character) => character.charCodeAt(0) <= 31)
  return filename.length > 0
    && filename.length <= 200
    && filename.endsWith('.zip')
    && !hasControlCharacter
    && !/[<>:"/\\|?*]/.test(filename)
    && !/[. ]$/.test(filename)
}

function isBase64(value: string): boolean {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)
}

export function handleExtensionMessage(
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): boolean | undefined {
  const isDownloadRequest = typeof message === 'object'
    && message !== null
    && (message as Record<string, unknown>).type === 'DOWNLOAD_ARCHIVE'
  if (!isDownloadRequest) return undefined

  if (!isDownloadArchiveMessage(message)
    || !isSafeZipFilename(message.filename)
    || !isBase64(message.base64)) {
    const response: DownloadArchiveResponse = { ok: false, error: 'Die Download-Anfrage ist ungültig.' }
    sendResponse(response)
    return false
  }

  void chrome.downloads.download({
    url: `data:application/zip;base64,${message.base64}`,
    filename: message.filename,
    saveAs: true,
  }).then((downloadId) => {
    const response: DownloadArchiveResponse = { ok: true, downloadId }
    sendResponse(response)
  }).catch((error: unknown) => {
    const permissionMissing = error instanceof Error && /permission/i.test(error.message)
    const response: DownloadArchiveResponse = {
      ok: false,
      error: permissionMissing
        ? 'Die Download-Berechtigung fehlt.'
        : 'Der Download konnte nicht gestartet werden.',
    }
    sendResponse(response)
  })
  return true
}

chrome.runtime.onMessage.addListener(handleExtensionMessage)
