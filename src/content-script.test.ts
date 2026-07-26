import { CONTENT_BUTTON_ID, CONTENT_ROOT_ID, ensureExportButton, exportCurrentConversation, startContentScript } from './content-script'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function getButton(): HTMLButtonElement {
  const host = document.getElementById(CONTENT_ROOT_ID)
  return host?.shadowRoot?.getElementById(CONTENT_BUTTON_ID) as HTMLButtonElement
}

describe('ChatGPT Content Script', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><article data-message-author-role="user">Hallo</article></main>'
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(chrome.downloads.download).mockReset().mockResolvedValue(1)
  })

  it('fügt den zugänglichen Button genau einmal ein', () => {
    ensureExportButton(); ensureExportButton()
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
    expect(getButton()).toHaveTextContent('Aktuellen Chat exportieren')
    expect(getButton()).toHaveAttribute('aria-label')
  })

  it('erzeugt auch nach einem Observer-Lauf keinen zweiten Button', async () => {
    const observer = startContentScript()
    document.querySelector('main')?.append(document.createElement('div'))
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
    observer.disconnect()
  })

  it('startet den Download bei Doppelklick genau einmal und ruft kein Netzwerk auf', async () => {
    ensureExportButton()
    const button = getButton()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const first = exportCurrentConversation(button)
    const second = exportCurrentConversation(button)
    await Promise.all([first, second])
    expect(chrome.downloads.download).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(button).toHaveTextContent('Download wurde gestartet.')
  })

  it('zeigt leere Unterhaltungen und Downloadfehler verständlich an', async () => {
    document.querySelector('main')!.innerHTML = ''
    ensureExportButton(); await exportCurrentConversation(getButton())
    expect(getButton()).toHaveTextContent('In der aktuell geöffneten Seite wurde keine Unterhaltung gefunden.')
    document.querySelector('main')!.innerHTML = '<div data-message-author-role="assistant">Antwort</div>'
    vi.mocked(chrome.downloads.download).mockRejectedValueOnce(new Error('intern'))
    await exportCurrentConversation(getButton())
    expect(getButton()).toHaveTextContent('Der Export konnte nicht erstellt werden.')
    expect(getButton()).not.toHaveTextContent('intern')
  })
})
