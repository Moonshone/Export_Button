import { CHATGPT_SELECTORS } from './chatgptSelectors'

export type ChatRole = 'user' | 'assistant' | 'system' | 'unknown'

export interface VisibleMessage {
  role: ChatRole
  content: string
  position: number
}

export interface VisibleConversation {
  title: string
  url: string
  messages: VisibleMessage[]
}

const KNOWN_ROLES = new Set<ChatRole>(['user', 'assistant', 'system'])

function isElementHidden(element: Element): boolean {
  return element.closest('[hidden], [aria-hidden="true"]') !== null ||
    (element instanceof HTMLElement && (element.style.display === 'none' || element.style.visibility === 'hidden'))
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function readText(message: Element): string {
  const clone = message.cloneNode(true) as Element
  clone.querySelectorAll(CHATGPT_SELECTORS.excludedContent).forEach((element) => element.remove())
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  clone.querySelectorAll('pre').forEach((pre) => {
    pre.prepend('\n')
    pre.append('\n')
  })
  clone.querySelectorAll('p, li, blockquote').forEach((block) => block.append('\n'))
  return normalizeText(clone.textContent ?? '')
}

function readRole(element: Element): ChatRole {
  const role = element.getAttribute('data-message-author-role') as ChatRole | null
  return role && KNOWN_ROLES.has(role) ? role : 'unknown'
}

export function sanitizeTitle(value: string): string {
  const withoutControlCharacters = Array.from(value, (character) =>
    character.charCodeAt(0) <= 31 ? '-' : character,
  ).join('')
  return withoutControlCharacters.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim() || 'ChatGPT-Unterhaltung'
}

export function getConversationTitle(documentRef: Document = document): string {
  const visibleTitle = Array.from(documentRef.querySelectorAll(CHATGPT_SELECTORS.title))
    .find((element) => !isElementHidden(element) && element.textContent?.trim())
    ?.textContent?.trim()
  const documentTitle = documentRef.title.replace(/\s*[|–-]\s*ChatGPT\s*$/i, '').trim()
  return sanitizeTitle(visibleTitle || documentTitle || 'ChatGPT-Unterhaltung')
}

export function readVisibleConversation(documentRef: Document = document): VisibleConversation {
  const main = documentRef.querySelector(CHATGPT_SELECTORS.conversation)
  const elements = main ? Array.from(main.querySelectorAll(CHATGPT_SELECTORS.message)) : []
  const messages = elements
    .filter((element) => !isElementHidden(element))
    .map((element) => ({ role: readRole(element), content: readText(element) }))
    .filter(({ content }) => content.length > 0)
    .map((message, index) => ({ ...message, position: index + 1 }))

  return { title: getConversationTitle(documentRef), url: documentRef.location.href, messages }
}
