import { beforeEach, describe, expect, it } from 'vitest'
import { detectChatGptPageContext } from './pageContext'

describe('ChatGPT-Seitenkontext', () => {
  beforeEach(() => { document.body.innerHTML = ''; window.history.replaceState({}, '', '/') })

  it.each(['/c/CHAT-ID', '/g/g-p-PROJEKT-ID/c/CHAT-ID'])('erkennt %s als geöffneten Chat', (path) => {
    window.history.replaceState({}, '', path)
    expect(detectChatGptPageContext()).toEqual({ type: 'chat', chatUrl: `https://chatgpt.com${path}` })
  })

  it('erkennt eine sichtbare Projektübersicht anhand mehrerer Signale', () => {
    window.history.replaceState({}, '', '/g/g-p-PROJEKT-ID')
    document.body.innerHTML = '<main data-testid="project-page"><h1>Mein Projekt</h1><button role="tab">Chats</button><section data-testid="project-chats"><a href="/g/g-p-PROJEKT-ID/c/CHAT-1">Chat 1</a></section></main>'
    expect(detectChatGptPageContext()).toEqual({ type: 'project-overview', projectId: 'g-p-PROJEKT-ID', projectTitle: 'Mein Projekt', projectUrl: 'https://chatgpt.com/g/g-p-PROJEKT-ID' })
  })

  it.each(['/g/g-p-AAA/project', '/g/g-p-AAA/project/', '/g/g-p-AAA/project?model=test', '/g/g-p-AAA/project#chats'])('erkennt die aktuelle Projektübersicht ohne h1: %s', (path) => {
    window.history.replaceState({}, '', path)
    document.body.innerHTML = '<main></main>'
    expect(detectChatGptPageContext()).toMatchObject({ type: 'project-overview', projectId: 'g-p-AAA', projectTitle: 'ChatGPT-Projekt' })
  })

  it('liest die echte Projektübersicht aus dem Composer und behält die /project-URL', () => {
    const id = 'g-p-6a573250902081919dedfa9c50fc0692-ki-methoden'
    window.history.replaceState({}, '', `/g/${id}/project`)
    document.body.innerHTML = `<main><div><div contenteditable="true" data-placeholder="Neuer Chat in KI_Methoden"></div></div><div role="tablist"><button role="tab" aria-selected="true">Chats</button><button role="tab">Quellen</button></div><div role="tabpanel"><a href="/g/${id}/c/chat-1">Chat 1</a></div></main>`
    expect(detectChatGptPageContext()).toEqual({ type: 'project-overview', projectId: id, projectTitle: 'KI_Methoden', projectUrl: `https://chatgpt.com/g/${id}/project` })
  })

  it('lehnt eine Projekt-URL ohne sichtbare Übersicht ab', () => {
    window.history.replaceState({}, '', '/g/g-p-PROJEKT-ID')
    document.body.innerHTML = '<main><h1>Mein Projekt</h1></main>'
    expect(detectChatGptPageContext()).toEqual({ type: 'unsupported' })
  })

  it.each(['/', '/settings'])('lehnt die nicht unterstützte Route %s ab', (path) => {
    window.history.replaceState({}, '', path)
    document.body.innerHTML = '<main><h1>ChatGPT</h1></main>'
    expect(detectChatGptPageContext()).toEqual({ type: 'unsupported' })
  })

  it('lehnt fremde Domains ab', () => {
    const foreign = document.implementation.createHTMLDocument('Fremd')
    expect(detectChatGptPageContext(foreign)).toEqual({ type: 'unsupported' })
  })
})
