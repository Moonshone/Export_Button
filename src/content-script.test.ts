import { CONTENT_BUTTON_ID, CONTENT_ROOT_ID, ensureExportButton, exportCurrentConversation, startContentScript } from './content-script'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function getButton(): HTMLButtonElement {
  const host = document.getElementById(CONTENT_ROOT_ID)
  return host?.shadowRoot?.getElementById(CONTENT_BUTTON_ID) as HTMLButtonElement
}

describe('ChatGPT Content Script', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><article data-message-author-role="user">Hallo</article></main>'
    vi.mocked(chrome.runtime.sendMessage).mockReset().mockResolvedValue({ ok: true, downloadId: 1 })
  })

  it('fügt den zugänglichen Button genau einmal ein', () => {
    ensureExportButton(); ensureExportButton()
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
    expect(getButton()).toHaveTextContent('Aktuellen Chat exportieren')
    expect(getButton()).toHaveAttribute('aria-label')
  })

  it('verwendet die kompakte Darstellung ohne den Buttontext abzuschneiden', () => {
    const host = ensureExportButton()
    const styles = host.shadowRoot?.querySelector('style')?.textContent
    expect(styles).toContain('max-width: min(175px, calc(100vw - 24px))')
    expect(styles).toContain('padding: 7px 10px')
    expect(styles).toContain('font: 600 11px/1.25 system-ui, sans-serif')
    expect(styles).not.toContain('text-overflow')
    expect(styles).not.toContain('white-space: nowrap')
  })

  it('kapselt die dunkelgrauen Exportbutton-Zustände im Shadow DOM', () => {
    const styles = ensureExportButton().shadowRoot?.querySelector('style')?.textContent
    expect(styles).toContain('.export-action{border-color:#3f3f46;background:#3f3f46;color:#ffffff}')
    expect(styles).toContain('.export-action:hover:not(:disabled){border-color:#27272a;background:#27272a}')
    expect(styles).toContain('.export-action:active:not(:disabled){border-color:#18181b;background:#18181b}')
    expect(styles).toContain('.export-action:disabled{border-color:#3f3f46;background:#3f3f46;cursor:wait;opacity:.65}')
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
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'DOWNLOAD_ARCHIVE', filename: expect.stringMatching(/\.zip$/),
      mimeType: 'application/zip', base64: expect.any(String),
    }))
    expect(chrome.downloads.download).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(button).toHaveTextContent('Aktuellen Chat exportieren')
    expect(button.getRootNode()).toHaveTextContent('Der Download wurde gestartet.')
  })

  it('zeigt leere Unterhaltungen und Service-Worker-Fehler verständlich an', async () => {
    document.querySelector('main')!.innerHTML = ''
    ensureExportButton(); await exportCurrentConversation(getButton())
    expect(getButton()).toHaveTextContent('Aktuellen Chat exportieren')
    expect(getButton().getRootNode()).toHaveTextContent('In der aktuell geöffneten Seite wurde keine Unterhaltung gefunden.')
    document.querySelector('main')!.innerHTML = '<div data-message-author-role="assistant">Antwort</div>'
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: false, error: 'Der Download konnte nicht gestartet werden.' })
    await exportCurrentConversation(getButton())
    expect(getButton().getRootNode()).toHaveTextContent('Der Download konnte nicht gestartet werden.')
    expect(getButton()).not.toHaveTextContent('intern')
  })

  it('behandelt einen nicht erreichbaren Service Worker ohne interne Details', async () => {
    ensureExportButton()
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(new Error('Receiving end does not exist'))
    await exportCurrentConversation(getButton())
    expect(getButton().getRootNode()).toHaveTextContent('Der Export konnte nicht erstellt werden. Bitte versuche es erneut.')
    expect(getButton()).not.toHaveTextContent('Receiving end')
    expect(getButton()).toBeEnabled()
  })
})
