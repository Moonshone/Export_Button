import { useRef, useState } from 'react'
import type { Conversation } from '../types/chat'
import { createChatExport, downloadArchive } from '../services/exportService'

interface ExportButtonProps {
  conversations: Conversation[]
  disabled?: boolean
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

export function ExportButton({ conversations, disabled = false }: ExportButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const exportInProgress = useRef(false)

  async function handleExport(): Promise<void> {
    if (exportInProgress.current) return
    exportInProgress.current = true
    setStatus('loading')

    try {
      const archive = await createChatExport(conversations)
      await downloadArchive(archive)
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      exportInProgress.current = false
    }
  }

  return (
    <div className="export-control">
      <button
        className="export-button"
        type="button"
        onClick={() => void handleExport()}
        disabled={disabled || status === 'loading'}
        aria-describedby="export-status"
      >
        <span aria-hidden="true">↓</span>
        {status === 'loading' ? 'Export wird erstellt …' : 'Daten exportieren'}
      </button>
      <p
        id="export-status"
        className={status === 'error' ? 'status-error' : 'export-status'}
        role="status"
        aria-live="polite"
      >
        {status === 'success' && 'Der Download wurde gestartet.'}
        {status === 'error' && 'Der Download konnte nicht gestartet werden. Bitte prüfe die Download-Berechtigung und versuche es erneut.'}
      </p>
    </div>
  )
}
