import { useRef, useState } from 'react'
import type { Conversation } from '../types/chat'
import { createChatExport, downloadArchive } from '../services/exportService'
import { calculateToastDuration, type ToastVariant } from '../services/toast'

interface ExportButtonProps {
  conversations: Conversation[]
  disabled?: boolean
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

export function ExportButton({ conversations, disabled = false }: ExportButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const exportInProgress = useRef(false)
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant }>()

  async function handleExport(): Promise<void> {
    if (exportInProgress.current) return
    exportInProgress.current = true
    setStatus('loading')
    setToast({ message: 'Export wird erstellt …', variant: 'progress' })

    try {
      const archive = await createChatExport(conversations)
      await downloadArchive(archive)
      setStatus('success')
      setToast({ message: 'Der Download wurde gestartet.', variant: 'success' })
    } catch {
      setStatus('error')
      setToast({ message: 'Der Download konnte nicht gestartet werden. Bitte prüfe die Download-Berechtigung und versuche es erneut.', variant: 'error' })
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
        Daten exportieren
      </button>
      <div id="export-status" className="popup-toasts" aria-label="Benachrichtigungen">
        {toast && <div className={`popup-toast ${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'} aria-live={toast.variant === 'error' ? 'assertive' : 'polite'} data-duration={calculateToastDuration(toast.message)}><span>{toast.message}</span><button type="button" aria-label="Nachricht schließen" onClick={() => setToast(undefined)}>×</button></div>}
      </div>
    </div>
  )
}
