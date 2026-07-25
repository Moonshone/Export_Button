import { useState } from 'react'
import type { Conversation } from '../types/chat'
import { createChatExport, downloadBlob } from '../services/exportService'

interface ExportButtonProps {
  conversations: Conversation[]
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

export function ExportButton({ conversations }: ExportButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle')

  async function handleExport(): Promise<void> {
    if (status === 'loading') {
      return
    }

    setStatus('loading')

    try {
      const archive = await createChatExport(conversations)
      downloadBlob(archive.blob, archive.filename)
      setStatus('success')
    } catch (error) {
      console.error('Der Export ist fehlgeschlagen.', error)
      setStatus('error')
    }
  }

  const statusText = {
    idle: 'Die Datei wird nur lokal auf deinem Computer gespeichert.',
    loading: 'Export wird erstellt ...',
    success: 'Der Download wurde gestartet.',
    error: 'Der Export konnte nicht erstellt werden.',
  }[status]

  return (
    <div className="export-control">
      <button
        className="export-button"
        type="button"
        onClick={handleExport}
        disabled={status === 'loading'}
      >
        <span aria-hidden="true">&#8595;</span>
        {status === 'loading' ? 'Wird erstellt ...' : 'Daten exportieren'}
      </button>
      <p className={`status status-${status}`} role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  )
}
