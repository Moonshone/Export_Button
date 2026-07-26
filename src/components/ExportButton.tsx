import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import type { Conversation } from '../types/chat'
import { createChatExport, downloadBlob } from '../services/exportService'

interface ExportButtonProps {
  conversations: Conversation[]
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

const EXPORT_ERROR =
  'Die ZIP-Datei konnte nicht erstellt werden. Bitte versuche es erneut.'

export function ExportButton({ conversations }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<ExportStatus>('idle')
  const exportInProgress = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const messageCount = conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  )

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus()
  }, [isOpen])

  function openDialog(): void {
    setStatus('idle')
    setIsOpen(true)
  }

  function closeDialog(): void {
    if (exportInProgress.current) return

    setIsOpen(false)
    setStatus('idle')
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
    }
  }

  async function handleExport(): Promise<void> {
    // The ref is updated synchronously, unlike React state, and therefore also
    // protects against two clicks arriving in the same render cycle.
    if (exportInProgress.current) return

    exportInProgress.current = true
    setStatus('loading')

    try {
      const archive = await createChatExport(conversations)
      downloadBlob(archive.blob, archive.filename)
      setStatus('success')
    } catch (error) {
      console.error('Der Export ist fehlgeschlagen.', error)
      setStatus('error')
    } finally {
      exportInProgress.current = false
    }
  }

  return (
    <div className="export-control">
      <button
        ref={triggerRef}
        className="export-button"
        type="button"
        onClick={openDialog}
      >
        <span aria-hidden="true">&#8595;</span>
        Daten exportieren
      </button>

      {isOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog()
          }}
        >
          <div
            className="export-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id={titleId}>Chatdaten exportieren</h2>
            <p id={descriptionId}>
              Deine lokal gespeicherten Unterhaltungen werden als ZIP-Datei auf
              deinem Computer gespeichert. Es werden keine Daten an einen Server
              übertragen.
            </p>

            <dl className="export-summary">
              <div><dt>Anzahl der Chats</dt><dd>{conversations.length}</dd></div>
              <div><dt>Anzahl der Nachrichten</dt><dd>{messageCount}</dd></div>
            </dl>

            <p
              className={`dialog-status status-${status}`}
              role="status"
              aria-live="polite"
            >
              {status === 'loading' && 'Export wird erstellt …'}
              {status === 'success' && 'Der Download wurde gestartet.'}
              {status === 'error' && EXPORT_ERROR}
            </p>

            <div className="dialog-actions">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeDialog}
                disabled={status === 'loading'}
              >
                Abbrechen
              </button>
              <button
                className="primary"
                type="button"
                onClick={handleExport}
                disabled={status === 'loading'}
              >
                ZIP-Datei erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
