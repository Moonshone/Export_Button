import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleConversations } from '../data/sampleChats'
import { ExportButton } from './ExportButton'

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test-url'),
    revokeObjectURL: vi.fn(),
  })

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})

describe('ExportButton', () => {
  it('startet den lokalen Download', async () => {
    const user = userEvent.setup()

    render(<ExportButton conversations={sampleConversations} />)

    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }))

    expect(
      await screen.findByText('Der Download wurde gestartet.'),
    ).toBeInTheDocument()
  })
})
