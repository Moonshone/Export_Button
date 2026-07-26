import { parseChatGptChatUrl, parseProjectOverviewUrl } from './chatUrl'
import { PROJECT_SELECTORS } from './projectSelectors'
import { parseChatGptGptUrl } from './gptUrl'
import { GPT_SELECTORS } from './gptSelectors'

export type ChatGptPageContext =
  | { type: 'chat'; chatUrl: string }
  | { type: 'project-overview'; projectId?: string; projectTitle: string; projectUrl: string }
  | { type: 'gpt-detail'; gptId?: string; gptName: string; gptUrl: string; accessLevel: 'public' | 'shared' | 'owned' | 'unknown' }
  | { type: 'gpt-editor'; gptId?: string; gptName: string; gptUrl: string }
  | { type: 'unsupported' }

const FALLBACK_PROJECT_TITLE = 'ChatGPT-Projekt'

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

function normalized(value: string | null | undefined): string | undefined {
  const result = value?.replace(/\s+/g, ' ').trim()
  return result || undefined
}

function composerTitle(element: Element): string | undefined {
  for (const attribute of ['placeholder', 'data-placeholder', 'aria-label']) {
    const value = normalized(element.getAttribute(attribute))
    const match = value?.match(/^(?:Neuer Chat in|New chat in)\s+(.+)$/i)
    if (match) return normalized(match[1])
  }
  return undefined
}

/** Reads a public, visible project title without relying on framework internals. */
export function readVisibleProjectTitle(documentRef: Document, url: URL | string): string {
  const main = Array.from(documentRef.querySelectorAll('main')).find(isVisible)
  if (main) {
    for (const selector of ['[data-testid="project-title"]', '[data-project-title]', 'h1']) {
      const node = Array.from(main.querySelectorAll(selector)).find((candidate) => isVisible(candidate) && normalized(candidate.textContent))
      const title = normalized(node?.textContent)
      if (title) return title
    }
    for (const node of main.querySelectorAll(PROJECT_SELECTORS.projectComposer)) {
      if (isVisible(node)) {
        const title = composerTitle(node)
        if (title) return title
      }
    }
  }
  const parsed = parseProjectOverviewUrl(typeof url === 'string' ? url : url.href)
  const slug = parsed?.projectId.match(/^g-p-[0-9a-f]{32}-([a-z0-9]+(?:-[a-z0-9]+)*)$/i)?.[1]
  return slug ? slug.replace(/-/g, ' ') : FALLBACK_PROJECT_TITLE
}

/** Detects exportable ChatGPT routes using the route and visible, public page markup only. */
export function detectChatGptPageContext(documentRef: Document = document): ChatGptPageContext {
  const url = chatGptUrl(documentRef)
  if (!url) return { type: 'unsupported' }

  const chat = parseChatGptChatUrl(url.href)
  const visibleMessages = Array.from(documentRef.querySelectorAll(GPT_SELECTORS.chatMessage)).some(isVisible)
  if (chat || (visibleMessages && /\/c\//.test(url.pathname))) return { type: 'chat', chatUrl: chat?.url ?? url.href }

  const gpt = parseChatGptGptUrl(url.href)
  if (gpt && gpt.type !== 'list') {
    const main = Array.from(documentRef.querySelectorAll('main')).find(isVisible)
    const name = normalized(main?.querySelector(GPT_SELECTORS.name)?.textContent)
    const signal = main && (name || main.querySelector(`${GPT_SELECTORS.description}, ${GPT_SELECTORS.instructions}, ${GPT_SELECTORS.starter}`))
    if (signal) return gpt.type === 'editor' ? { type: 'gpt-editor', gptId: gpt.id, gptName: name ?? 'ChatGPT-GPT', gptUrl: gpt.url } : { type: 'gpt-detail', gptId: gpt.id, gptName: name ?? 'ChatGPT-GPT', gptUrl: gpt.url, accessLevel: 'unknown' }
  }

  const project = parseProjectOverviewUrl(url.href)
  if (!project) return { type: 'unsupported' }

  const main = Array.from(documentRef.querySelectorAll('main')).find(isVisible)
  if (!main) return { type: 'unsupported' }
  const chatsTab = Array.from(main.querySelectorAll(PROJECT_SELECTORS.tab)).find((node) => isVisible(node) && node.textContent?.trim() === 'Chats')
  const chatContainer = Array.from(main.querySelectorAll(PROJECT_SELECTORS.chatContainer)).find(isVisible)
  const composer = Array.from(main.querySelectorAll(PROJECT_SELECTORS.projectComposer)).find(isVisible)
  const expectedPrefix = `/g/${project.projectId}/c/`
  const chatLinks = Array.from(main.querySelectorAll<HTMLAnchorElement>('a[href]')).filter((link) => {
    if (!isVisible(link)) return false
    try { return new URL(link.href, url.href).pathname.startsWith(expectedPrefix) } catch { return false }
  })

  // The explicit /project route is authoritative once its visible main exists.
  // Legacy root routes still need a public DOM signal to avoid false positives.
  if (project.routeType === 'project-root' && !chatsTab && !chatContainer && !composer && chatLinks.length === 0) return { type: 'unsupported' }
  return {
    type: 'project-overview',
    projectId: project.projectId,
    projectTitle: readVisibleProjectTitle(documentRef, url),
    projectUrl: project.url,
  }
}
