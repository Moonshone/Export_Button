import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('lokale Chat-Oberfläche', () => {
  beforeEach(() => localStorage.clear())

  it('erstellt einen Chat, speichert eine Nachricht und lädt sie erneut', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Neuen Chat erstellen' }))
    await user.type(screen.getByLabelText('Nachricht'), 'Hallo{enter}mit Zeilenumbruch')
    await user.selectOptions(screen.getByLabelText('Rolle'), 'assistant')
    await user.click(screen.getByRole('button', { name: 'Nachricht hinzufügen' }))

    expect(screen.getByLabelText('Nachricht von Assistent')).toHaveTextContent('Hallo mit Zeilenumbruch')
    view.unmount()
    render(<App />)
    expect(screen.getByLabelText('Nachricht von Assistent')).toBeInTheDocument()
  })

  it('verhindert leere Nachrichten und kann einen Chat umbenennen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Neuen Chat erstellen' }))
    expect(screen.getByRole('button', { name: 'Nachricht hinzufügen' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Chat umbenennen' }))
    await user.clear(screen.getByLabelText('Chatname'))
    await user.type(screen.getByLabelText('Chatname'), 'Mein Projekt')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(screen.getByRole('heading', { name: 'Mein Projekt' })).toBeInTheDocument()
  })

  it('löscht nur nach einer Bestätigung', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Neuen Chat erstellen' }))
    await user.click(screen.getByRole('button', { name: 'Chat löschen' }))
    expect(screen.getByRole('heading', { name: 'Neuer Chat' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chat löschen' }))
    expect(screen.getByRole('heading', { name: 'Deine lokalen Chats' })).toBeInTheDocument()
  })

  it('erhält Umlaute, Emojis und Codeblöcke als sicheren Text', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Neuen Chat erstellen' }))
    await user.type(
      screen.getByLabelText('Nachricht'),
      'Grüße 👋\n```ts\nconst wert = "<script>"\n```',
    )
    await user.click(screen.getByRole('button', { name: 'Nachricht hinzufügen' }))

    const message = screen.getByLabelText('Nachricht von Benutzer')
    expect(message).toHaveTextContent('Grüße 👋')
    expect(message.querySelector('code')).toHaveTextContent('const wert = "<script>"')
    expect(message.querySelector('script')).toBeNull()
  })
})
