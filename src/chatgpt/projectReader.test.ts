import { describe, expect, it, vi } from 'vitest'
import { discoverProject, MAX_PROJECT_CHATS, ProjectChatLimitError, readChatGptProject, safeChatGptUrl } from './projectReader'

function page(path = '/project/pro-1'): void { window.history.replaceState({}, '', path); document.body.innerHTML = `<main data-testid="project-page" data-project-id="pro-1"><h1 data-testid="project-title">Mein Projekt 👋</h1><div data-testid="project-chats"><a href="/c/a">Erster</a><a href="/c/a">Duplikat</a><a href="https://evil.test/c/x">Fremd</a><a href="/c/b">Erster</a></div><div data-testid="project-instructions">Sei präzise.</div><a data-testid="file" download="Grüße.pdf" href="/files/x">Grüße.pdf</a></main>` }
describe('Projektleser', () => {
  it('erkennt ein Projekt mit Name, ID, Chats und Dateien', () => { page(); expect(readChatGptProject()).toMatchObject({ id: 'pro-1', title: 'Mein Projekt 👋', chats: [{ id: 'a', position: 1 }, { id: 'b', position: 2 }], instructions: 'Sei präzise.' }); expect(readChatGptProject()?.files).toHaveLength(1) })
  it('erkennt einen normalen Chat nicht', () => { window.history.replaceState({}, '', '/c/a'); document.body.innerHTML = '<main><h1>Chat</h1></main>'; expect(readChatGptProject()).toBeUndefined() })
  it('nutzt einen Projektnamen-Fallback', () => { page(); document.querySelector('h1')?.remove(); expect(readChatGptProject()?.title).toBe('ChatGPT-Projekt') })
  it('lehnt fremde URLs ab', () => expect(safeChatGptUrl('https://evil.test/c/a')).toBeUndefined())
  it('stellt die Scrollposition wieder her und stoppt stabil', async () => { page(); const container = document.querySelector<HTMLElement>('[data-testid="project-chats"]')!; container.scrollTop = 12; Object.defineProperty(container, 'scrollHeight', { value: 200 }); const wait = vi.fn().mockResolvedValue(undefined); await discoverProject(document, wait); expect(wait).toHaveBeenCalledTimes(3); expect(container.scrollTop).toBe(12) })
  it('erzwingt das Sicherheitslimit', () => { page(); const container = document.querySelector('[data-testid="project-chats"]')!; container.innerHTML = Array.from({ length: MAX_PROJECT_CHATS + 1 }, (_, index) => `<a href="/c/${index}">Chat</a>`).join(''); expect(() => readChatGptProject()).toThrow(ProjectChatLimitError) })
})
