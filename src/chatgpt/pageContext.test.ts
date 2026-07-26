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
