import { parseChatGptChatUrl, projectIdFromChatGptUrl } from './chatUrl'
import { PROJECT_SELECTORS } from './projectSelectors'

export type ChatGptPageContext =
  | { type: 'chat'; chatUrl: string }
  | { type: 'project-overview'; projectId?: string; projectTitle: string; projectUrl: string }
  | { type: 'unsupported' }

function isVisible(element: Element): boolean {
  if (element.closest('[hidden], [aria-hidden="true"]')) return false
  return !(element instanceof HTMLElement) || (element.style.display !== 'none' && element.style.visibility !== 'hidden')
}

function chatGptUrl(documentRef: Document): URL | undefined {
  try {
    const url = new URL(documentRef.location.href)
    return url.protocol === 'https:' && url.hostname === 'chatgpt.com' && !url.port ? url : undefined
  } catch {
    return undefined
  }
}

/** Detects exportable ChatGPT routes using the route and visible, public page markup only. */
export function detectChatGptPageContext(documentRef: Document = document): ChatGptPageContext {
  const url = chatGptUrl(documentRef)
  if (!url) return { type: 'unsupported' }

  const chat = parseChatGptChatUrl(url.href)
  if (chat) return { type: 'chat', chatUrl: chat.url }

  const projectMatch = url.pathname.match(/^\/g\/(g-p-[A-Za-z0-9_-]+)\/?$/)
  if (!projectMatch) return { type: 'unsupported' }

  const main = Array.from(documentRef.querySelectorAll('main')).find(isVisible)
  if (!main) return { type: 'unsupported' }
  const title = Array.from(main.querySelectorAll(PROJECT_SELECTORS.title)).find((node) => isVisible(node) && Boolean(node.textContent?.trim()))
  const chatsTab = Array.from(main.querySelectorAll('[role="tab"], button, a')).find((node) => isVisible(node) && node.textContent?.trim() === 'Chats')
  const chatContainer = Array.from(main.querySelectorAll(PROJECT_SELECTORS.chatContainer)).find(isVisible)
  const expectedPrefix = `/g/${projectMatch[1]}/c/`
  const chatLinks = Array.from(main.querySelectorAll<HTMLAnchorElement>('a[href]')).filter((link) => {
    if (!isVisible(link)) return false
    try { return new URL(link.href, url.href).pathname.startsWith(expectedPrefix) } catch { return false }
  })

  // A bare project-looking URL is insufficient. Require a visible title plus
  // either its Chats tab/container or at least one project-owned chat link.
  if (!title || (!chatsTab && !chatContainer && chatLinks.length === 0)) return { type: 'unsupported' }
  return {
    type: 'project-overview',
    projectId: projectIdFromChatGptUrl(url.href),
    projectTitle: title.textContent?.replace(/\s+/g, ' ').trim() || 'ChatGPT-Projekt',
    projectUrl: url.href,
  }
}
