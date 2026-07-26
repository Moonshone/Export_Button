import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Conversation } from './types/chat'

const conversations: Conversation[] = [{
  id: 'chat-1', title: 'Test', createdAt: '2026-07-26T10:00:00.000Z',
  updatedAt: '2026-07-26T10:00:00.000Z',
  messages: [
    { id: 'm1', role: 'user', content: 'Hallo', createdAt: '2026-07-26T10:00:00.000Z' },
    { id: 'm2', role: 'assistant', content: 'Hi', createdAt: '2026-07-26T10:01:00.000Z' },
  ],
}]

describe('Erweiterungs-Popup', () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ conversations })
  })

  it('rendert Popup, Exportbutton und Lokalitätshinweis', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Lokaler Chat-Export' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Daten exportieren' })).toBeInTheDocument()
    expect(screen.getByText(/ausschließlich lokal/)).toBeInTheDocument()
    await waitFor(() => expect(chrome.storage.local.get).toHaveBeenCalledWith('conversations'))
  })

  it('zeigt Chat- und Nachrichtenanzahl', async () => {
    render(<App />)
    expect(await screen.findByText('1', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('2', { selector: 'dd' })).toBeInTheDocument()
  })

  it('zeigt einen verständlichen Ladefehler', async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('intern'))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden')
    expect(screen.getByRole('button', { name: 'Daten exportieren' })).toBeDisabled()
  })
})
