import { parseChatGptChatUrl, projectIdFromChatGptUrl } from './chatUrl'
import { PROJECT_SELECTORS, PROJECT_URL_PATTERN } from './projectSelectors'
import type { ChatGptProject, ProjectChatReference, ProjectFileReference } from './projectTypes'

export const MAX_PROJECT_CHATS = 500
export class ProjectChatLimitError extends Error {}

function visible(element: Element): boolean {
  return !element.closest('[hidden], [aria-hidden="true"]') && (!(element instanceof HTMLElement) || (element.style.display !== 'none' && element.style.visibility !== 'hidden'))
}
export function safeChatGptUrl(value: string, base = 'https://chatgpt.com/'): URL | undefined {
  try { const url = new URL(value, base); return url.origin === 'https://chatgpt.com' ? url : undefined } catch { return undefined }
}
function projectId(url: URL, area: Element): string | undefined {
  return projectIdFromChatGptUrl(url.href) || area.getAttribute('data-project-id') || url.pathname.match(/^\/project\/([^/]+)/)?.[1]
}
function title(link: Element): string {
  const prominent = Array.from(link.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, [role="heading"]')).find(visible)
  const candidate = prominent?.textContent || link.getAttribute('aria-label') || link.getAttribute('title') || link.textContent?.split(/\r?\n/).find((line) => line.trim())
  return candidate?.replace(/\s+/g, ' ').trim() || 'ChatGPT-Unterhaltung'
}
function chatReferences(container: Element, base: string, currentProjectId: string | undefined): ProjectChatReference[] {
  const seen = new Set<string>(); const result: ProjectChatReference[] = []
  for (const link of container.querySelectorAll<HTMLAnchorElement>(PROJECT_SELECTORS.chatLink)) {
    if (!visible(link)) continue
    const parsed = parseChatGptChatUrl(link.getAttribute('href') ?? '', base)
    const belongs = currentProjectId?.startsWith('g-p-') ? parsed?.type === 'project-chat' && parsed.projectId === currentProjectId : Boolean(parsed)
    if (!parsed || !belongs || seen.has(parsed.url)) continue
    seen.add(parsed.url); result.push({ id: parsed.chatId, title: title(link), url: parsed.url, position: result.length + 1 })
    if (result.length > MAX_PROJECT_CHATS) throw new ProjectChatLimitError('Das Projekt enthält mehr als 500 Chats und kann in einem Vorgang nicht exportiert werden.')
  }
  return result
}
function files(area: Element, base: string): ProjectFileReference[] {
  const seen = new Set<string>(); const result: ProjectFileReference[] = []
  for (const node of area.querySelectorAll<HTMLElement>(PROJECT_SELECTORS.file)) {
    if (!visible(node)) continue
    const anchor = node instanceof HTMLAnchorElement ? node : node.querySelector<HTMLAnchorElement>('a[href]')
    const name = node.getAttribute('data-file-name') || anchor?.getAttribute('download') || node.textContent?.trim()
    if (!name || seen.has(name)) continue
    const url = anchor ? safeChatGptUrl(anchor.getAttribute('href') ?? '', base)?.href : undefined
    seen.add(name); result.push({ id: node.getAttribute('data-file-id') || undefined, name, url, source: 'project', downloadable: Boolean(url && (anchor?.hasAttribute('download') || node.getAttribute('data-downloadable') === 'true')) })
  }
  return result
}
export function readChatGptProject(documentRef: Document = document): ChatGptProject | undefined {
  const url = safeChatGptUrl(documentRef.location.href) ?? safeChatGptUrl(`${documentRef.location.pathname}${documentRef.location.search}${documentRef.location.hash}`); if (!url || !PROJECT_URL_PATTERN.test(url.pathname)) return undefined
  const area = Array.from(documentRef.querySelectorAll(PROJECT_SELECTORS.area)).find(visible) || documentRef.querySelector('main'); if (!area) return undefined
  const id = projectId(url, area)
  const explicitContainer = Array.from(documentRef.querySelectorAll(PROJECT_SELECTORS.chatContainer)).find(visible)
  const container = explicitContainer || documentRef.querySelector('main') || area
  const chats = chatReferences(container, url.href, id)
  const titleElement = Array.from(area.querySelectorAll(PROJECT_SELECTORS.title)).find((node) => visible(node) && node.textContent?.trim())
  const instructionsElement = Array.from(area.querySelectorAll(PROJECT_SELECTORS.instructions)).find((node) => visible(node) && node.textContent?.trim())
  return { id, title: titleElement?.textContent?.trim() || 'ChatGPT-Projekt', url: url.href, instructions: instructionsElement?.textContent?.trim() || undefined, chats, files: files(area, url.href) }
}
export async function discoverProject(documentRef: Document = document, wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))): Promise<ChatGptProject | undefined> {
  let project = readChatGptProject(documentRef); if (!project) return undefined
  const area = documentRef.querySelector(PROJECT_SELECTORS.area); const container = area?.querySelector<HTMLElement>(PROJECT_SELECTORS.chatContainer)
  if (!container) return project
  const original = container.scrollTop; let stable = 0; let previous = project.chats.length
  try {
    for (let step = 0; step < 20 && stable < 3; step += 1) {
      container.scrollTop = container.scrollHeight; await wait(75); project = readChatGptProject(documentRef) ?? project
      stable = project.chats.length === previous ? stable + 1 : 0; previous = project.chats.length
    }
  } finally { container.scrollTop = original }
  return project
}
