import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportButton } from './ExportButton'
import * as exportService from '../services/exportService'

vi.mock('../services/exportService', async (importOriginal) => {
  const actual = await importOriginal<typeof exportService>()
  return { ...actual, createChatExport: vi.fn(), downloadArchive: vi.fn() }
})

const archive = { blob: new Blob(['zip']), filename: 'chat-export-2026-07-26-10-00.zip' }

describe('ExportButton', () => {
  beforeEach(() => {
    vi.mocked(exportService.createChatExport).mockReset().mockResolvedValue(archive)
    vi.mocked(exportService.downloadArchive).mockReset().mockResolvedValue(1)
  })

  it('erstellt ZIP und startet genau einen Download', async () => {
    const user = userEvent.setup()
    render(<ExportButton conversations={[]} />)
    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    expect(exportService.createChatExport).toHaveBeenCalledWith([])
    expect(exportService.downloadArchive).toHaveBeenCalledWith(archive)
    expect(await screen.findByText('Der Download wurde gestartet.')).toBeInTheDocument()
  })

  it('deaktiviert den Button und verhindert doppelte Downloads', async () => {
    let finish!: (value: typeof archive) => void
    vi.mocked(exportService.createChatExport).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const user = userEvent.setup()
    render(<ExportButton conversations={[]} />)
    const button = screen.getByRole('button', { name: 'Daten exportieren' })
    await user.dblClick(button)
    expect(screen.getByRole('button', { name: 'Export wird erstellt …' })).toBeDisabled()
    expect(exportService.createChatExport).toHaveBeenCalledTimes(1)
    finish(archive)
    expect(await screen.findByText('Der Download wurde gestartet.')).toBeInTheDocument()
    expect(exportService.downloadArchive).toHaveBeenCalledTimes(1)
  })

  it('zeigt Downloadfehler ohne Stacktrace', async () => {
    vi.mocked(exportService.downloadArchive).mockRejectedValue(new Error('interner Stack'))
    const user = userEvent.setup()
    render(<ExportButton conversations={[]} />)
    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    expect(await screen.findByText(/Download konnte nicht gestartet/)).toBeInTheDocument()
    expect(screen.queryByText(/interner Stack/)).not.toBeInTheDocument()
  })
})
