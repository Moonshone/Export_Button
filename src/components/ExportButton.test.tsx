import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleConversations } from '../data/sampleChats'
import * as exportService from '../services/exportService'
import { ExportButton } from './ExportButton'

const archive = {
  blob: new Blob(['export']),
  filename: 'chat-export.zip',
}

beforeEach(() => {
  vi.spyOn(exportService, 'createChatExport').mockResolvedValue(archive)
  vi.spyOn(exportService, 'downloadBlob').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ExportButton', () => {
  it('öffnet den Dialog mit Zusammenfassung und setzt den Fokus hinein', async () => {
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)

    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))

    const dialog = screen.getByRole('dialog', { name: 'Chatdaten exportieren' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription(
      'Deine lokal gespeicherten Unterhaltungen werden als ZIP-Datei auf deinem Computer gespeichert. Es werden keine Daten an einen Server übertragen.',
    )
    expect(screen.getByText('Anzahl der Chats')).toBeInTheDocument()
    expect(screen.getByText('Anzahl der Nachrichten')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus()
  })

  it('bricht ab und gibt den Fokus an den Exportbutton zurück', async () => {
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)
    const trigger = screen.getByRole('button', { name: 'Daten exportieren' })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('schließt den Dialog mit Escape', async () => {
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)
    const trigger = screen.getByRole('button', { name: 'Daten exportieren' })

    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('hält den Tastaturfokus im geöffneten Dialog', async () => {
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)

    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    const cancelButton = screen.getByRole('button', { name: 'Abbrechen' })
    const createButton = screen.getByRole('button', { name: 'ZIP-Datei erstellen' })

    expect(cancelButton).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(createButton).toHaveFocus()
    await user.tab()
    expect(cancelButton).toHaveFocus()
  })

  it('schließt den Dialog bei einem Klick außerhalb', async () => {
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)

    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    const dialog = screen.getByRole('dialog')
    await user.click(dialog.parentElement as HTMLElement)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('erstellt den Export nur einmal und meldet den gestarteten Download', async () => {
    let finishExport: ((value: typeof archive) => void) | undefined
    vi.mocked(exportService.createChatExport).mockImplementation(
      () => new Promise((resolve) => { finishExport = resolve }),
    )
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)
    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    const createButton = screen.getByRole('button', { name: 'ZIP-Datei erstellen' })

    await user.dblClick(createButton)

    expect(exportService.createChatExport).toHaveBeenCalledTimes(1)
    expect(createButton).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled()
    expect(screen.getByText('Export wird erstellt …')).toBeInTheDocument()

    finishExport?.(archive)
    expect(
      await screen.findByText('Der Download wurde gestartet.'),
    ).toBeInTheDocument()
    expect(exportService.downloadBlob).toHaveBeenCalledWith(
      archive.blob,
      archive.filename,
    )
  })

  it('zeigt bei Fehlern eine sichere Meldung ohne technische Details', async () => {
    vi.mocked(exportService.createChatExport).mockRejectedValue(
      new Error('Interner Stacktrace: geheimer Dateipfad'),
    )
    const user = userEvent.setup()
    render(<ExportButton conversations={sampleConversations} />)

    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    await user.click(screen.getByRole('button', { name: 'ZIP-Datei erstellen' }))

    expect(
      await screen.findByText(
        'Die ZIP-Datei konnte nicht erstellt werden. Bitte versuche es erneut.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Stacktrace|Dateipfad/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeEnabled()
  })
})
