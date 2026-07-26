import { CONTENT_BUTTON_ID, CONTENT_ROOT_ID, cancelProjectExport, ensureExportButton, exportCurrentConversation, exportProject, renderExportButtonState, startContentScript, updateButtonFromCurrentPageContext } from './content-script'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function button(): HTMLButtonElement {
  return document.getElementById(CONTENT_ROOT_ID)?.shadowRoot?.getElementById(CONTENT_BUTTON_ID) as HTMLButtonElement
}
function shadow(): ShadowRoot { return button().getRootNode() as ShadowRoot }
function chat(path = '/c/CHAT-ID'): void {
  window.history.replaceState({}, '', path)
  document.body.innerHTML = '<main><article data-message-author-role="user">Hallo</article></main>'
}
function project(): void {
  window.history.replaceState({}, '', '/g/g-p-AAA')
  document.body.innerHTML = '<main data-testid="project-page"><h1>Beispielprojekt</h1><button role="tab">Chats</button><section data-testid="project-chats"><a href="/g/g-p-AAA/c/CHAT-1"><strong>Erster Chat</strong></a></section></main>'
}

describe('kontextabhängiger Exportbutton', () => {
  beforeEach(() => {
    chat()
    vi.mocked(chrome.runtime.sendMessage).mockReset().mockResolvedValue({ ok: true, downloadId: 1 })
  })

  it('fügt genau einen permanenten Button und einen Shadow-Host ein', () => {
    ensureExportButton(); ensureExportButton()
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
    expect(shadow().querySelectorAll('.actions > button')).toHaveLength(1)
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    expect(shadow().querySelector('#chat-export-project-button')).toBeNull()
    expect(shadow().querySelector('#cancel-project-export')).toBeNull()
  })

  it('rendert sämtliche Zustände zentral und zugänglich', () => {
    ensureExportButton()
    renderExportButtonState(button(), 'chat-exporting')
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    expect(button()).toBeDisabled()
    expect(button()).toHaveAttribute('aria-busy', 'true')
    renderExportButtonState(button(), 'project-exporting')
    expect(button()).toHaveTextContent('Export abbrechen')
    expect(button()).toBeEnabled()
    expect(button()).toHaveClass('cancel-action')
    renderExportButtonState(button(), 'project-cancelling')
    expect(button()).toHaveTextContent('Export wird abgebrochen …')
    expect(button()).toBeDisabled()
    renderExportButtonState(button(), 'hidden')
    expect(button()).not.toBeVisible()
  })

  it('wechselt bei SPA-Navigation zwischen Projekt, Projektchat, Start und Chat', async () => {
    project(); const host = ensureExportButton()
    expect(button()).toHaveTextContent('Ganzes Projekt exportieren')
    chat('/g/g-p-AAA/c/CHAT-1'); host.remove(); ensureExportButton(); updateButtonFromCurrentPageContext()
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    window.history.replaceState({}, '', '/'); updateButtonFromCurrentPageContext()
    expect(button()).not.toBeVisible()
    chat(); host.remove(); ensureExportButton(); updateButtonFromCurrentPageContext()
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    const observer = startContentScript()
    document.querySelector('main')?.append(document.createElement('div'), document.createElement('div'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
    expect(shadow().querySelectorAll('.actions > button')).toHaveLength(1)
    observer.disconnect()
  })

  it('zeigt auf der realistischen /project-Seite sofort genau einen aktiven Projektbutton und reagiert auf History-Navigation', async () => {
    const id = 'g-p-6a573250902081919dedfa9c50fc0692-ki-methoden'
    window.history.replaceState({}, '', `/g/${id}/project`)
    document.body.innerHTML = `<main><div><div contenteditable="true" data-placeholder="Neuer Chat in KI_Methoden"></div></div><div role="tablist"><button role="tab" aria-selected="true">Chats</button><button role="tab">Quellen</button></div><div role="tabpanel">${[1, 2, 3].map((number) => `<a href="/g/${id}/c/chat-${number}"><strong>Chat ${number}</strong></a>`).join('')}</div></main>`
    startContentScript()
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
    expect(button()).toHaveTextContent('Ganzes Projekt exportieren')
    expect(button()).toBeVisible(); expect(button()).toBeEnabled()
    expect(button()).toHaveAttribute('aria-busy', 'false'); expect(button()).toHaveAttribute('data-mode', 'project-idle')
    expect(shadow().querySelectorAll('.actions > button')).toHaveLength(1)

    window.history.pushState({}, '', `/g/${id}/c/chat-1`)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    window.history.replaceState({}, '', `/g/${id}/project`)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(button()).toHaveTextContent('Ganzes Projekt exportieren')
  })

  it('zeigt auf der GPT-Detailseite sofort einen Button und wechselt bei Nachrichten denselben Button', async () => {
    window.history.replaceState({}, '', '/g/g-69de136277f4819189aa21247ccb1538-english-lerncoach')
    document.body.innerHTML = '<div role="main"><section><div contenteditable="true" data-placeholder="ChatGPT fragen"></div></section></div>'
    startContentScript()
    expect(button()).toHaveTextContent('GPT exportieren'); expect(button()).toBeVisible(); expect(button()).toBeEnabled()
    expect(button()).toHaveAttribute('aria-busy', 'false'); expect(button()).toHaveAttribute('data-mode', 'gpt-idle')
    document.querySelector('section')?.insertAdjacentHTML('afterbegin', '<h1>English Lerncoach</h1><article data-message-author-role="user">Hallo</article>')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    document.querySelector('article')?.remove(); updateButtonFromCurrentPageContext(); await new Promise((resolve) => setTimeout(resolve, 0))
    expect(button()).toHaveTextContent('GPT exportieren')
    expect(document.querySelectorAll(`#${CONTENT_ROOT_ID}`)).toHaveLength(1)
  })

  it('startet einen Chat-Download bei Doppelklick nur einmal', async () => {
    ensureExportButton()
    const first = exportCurrentConversation(button())
    const second = exportCurrentConversation(button())
    expect(button()).toBeDisabled()
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    await Promise.all([first, second])
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
    expect(button().getRootNode()).toHaveTextContent('Der Download wurde gestartet.')
    expect(button()).toBeEnabled()
  })

  it('zeigt Chat-Fehler ausschließlich als Toast und setzt den Zustand zurück', async () => {
    ensureExportButton()
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(new Error('intern'))
    await exportCurrentConversation(button())
    expect(button().getRootNode()).toHaveTextContent('Der Export konnte nicht erstellt werden. Bitte versuche es erneut.')
    expect(button()).toHaveTextContent('Aktuellen Chat exportieren')
    expect(button()).not.toHaveTextContent('intern')
  })

  it('startet bei einem Projekt ohne Chats keinen Export', async () => {
    window.history.replaceState({}, '', '/g/g-p-AAA')
    document.body.innerHTML = '<main data-testid="project-page"><h1>Leer</h1><button role="tab">Chats</button><section data-testid="project-chats"></section></main>'
    ensureExportButton()
    await exportProject(button())
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    expect(button().getRootNode()).toHaveTextContent('In diesem Projekt wurden keine exportierbaren Chats gefunden.')
    expect(button()).toHaveTextContent('Ganzes Projekt exportieren')
  })

  it('verwendet denselben Button zum Exportieren und sendet Abbruch nur einmal', async () => {
    project(); ensureExportButton()
    let resolveStart!: (value: unknown) => void
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: unknown) => {
      if ((message as { type?: string }).type === 'START_PROJECT_EXPORT') return new Promise((resolve) => { resolveStart = resolve })
      return Promise.resolve({ ok: true })
    })
    const running = exportProject(button())
    await vi.waitFor(() => expect(shadow().querySelector('[data-confirm]')).not.toBeNull())
    ;(shadow().querySelector('[data-confirm]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(button()).toHaveTextContent('Export abbrechen'))
    expect(shadow().querySelectorAll('.actions > button')).toHaveLength(1)
    const firstCancel = cancelProjectExport()
    const secondCancel = cancelProjectExport()
    expect(button()).toHaveTextContent('Export wird abgebrochen …')
    await Promise.all([firstCancel, secondCancel])
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2)
    expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'CANCEL_PROJECT_EXPORT' }))
    expect(button().getRootNode()).toHaveTextContent('Der Projekt-Export wurde abgebrochen.')
    expect(button()).toHaveTextContent('Ganzes Projekt exportieren')
    resolveStart({ ok: false, errorCode: 'CANCELLED', message: 'Der Projekt-Export wurde abgebrochen.' })
    await running
  })

  it('behält bei DOM-Mutationen während eines aktiven Projekt-Exports den Abbruchmodus', async () => {
    project(); ensureExportButton()
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(() => new Promise(() => undefined))
    void exportProject(button())
    await vi.waitFor(() => expect(shadow().querySelector('[data-confirm]')).not.toBeNull())
    ;(shadow().querySelector('[data-confirm]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(button()).toHaveTextContent('Export abbrechen'))
    document.querySelector('main')?.append(document.createElement('div'))
    updateButtonFromCurrentPageContext()
    expect(button()).toHaveTextContent('Export abbrechen')
  })

  it('enthält kompakte Normal- und rote Abbruchfarben im Shadow DOM', () => {
    const styles = ensureExportButton().shadowRoot?.querySelector('style')?.textContent
    expect(styles).toContain('max-width: min(175px, calc(100vw - 24px))')
    expect(styles).toContain('background:#3f3f46;color:#ffffff')
    expect(styles).toContain('background:#27272a')
    expect(styles).toContain('background:#18181b')
    expect(styles).toContain('.export-action.cancel-action{border-color:#9f2d26;background:#9f2d26}')
  })
})
