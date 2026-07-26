export type DownloadArchiveMessage = {
  type: 'DOWNLOAD_ARCHIVE'
  filename: string
  mimeType: 'application/zip'
  base64: string
}

export type DownloadArchiveResponse =
  | { ok: true; downloadId: number }
  | { ok: false; error: string }

export function isDownloadArchiveMessage(message: unknown): message is DownloadArchiveMessage {
  if (typeof message !== 'object' || message === null) return false
  const value = message as Record<string, unknown>
  return value.type === 'DOWNLOAD_ARCHIVE'
    && typeof value.filename === 'string'
    && value.mimeType === 'application/zip'
    && typeof value.base64 === 'string'
}
