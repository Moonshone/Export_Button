export type ParsedChatGptChatUrl = {
  url: string
  chatId: string
  projectId?: string
  type: 'normal-chat' | 'project-chat'
}

export type ParsedProjectOverviewUrl = {
  url: string
  projectId: string
  routeType: 'project-root' | 'project-overview'
}

const ID = '[A-Za-z0-9_-]+'
const NORMAL_CHAT = new RegExp(`^/c/(${ID})/?$`)
const PROJECT_CHAT = new RegExp(`^/g/(g-p-${ID})/c/(${ID})/?$`)
export const PROJECT_OVERVIEW_ROUTE = new RegExp(`^/g/(g-p-${ID})(/project)?/?$`)

/** Parses only the two public ChatGPT project overview route variants. */
export function parseProjectOverviewUrl(value: string, baseUrl = 'https://chatgpt.com/'): ParsedProjectOverviewUrl | undefined {
  try {
    const url = new URL(value, baseUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port) return undefined
    const match = url.pathname.match(PROJECT_OVERVIEW_ROUTE)
    if (!match) return undefined
    return { url: url.href, projectId: match[1], routeType: match[2] ? 'project-overview' : 'project-root' }
  } catch {
    return undefined
  }
}

/** Parses only public ChatGPT chat routes; query strings and fragments are retained in url. */
export function parseChatGptChatUrl(value: string, baseUrl = 'https://chatgpt.com/'): ParsedChatGptChatUrl | undefined {
  try {
    const url = new URL(value, baseUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port) return undefined
    const project = url.pathname.match(PROJECT_CHAT)
    if (project) return { url: url.href, chatId: project[2], projectId: project[1], type: 'project-chat' }
    const normal = url.pathname.match(NORMAL_CHAT)
    if (normal) return { url: url.href, chatId: normal[1], type: 'normal-chat' }
  } catch {
    return undefined
  }
  return undefined
}

export function projectIdFromChatGptUrl(value: string, baseUrl = 'https://chatgpt.com/'): string | undefined {
  try {
    const url = new URL(value, baseUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port) return undefined
    return url.pathname.match(/^\/g\/(g-p-[A-Za-z0-9_-]+)(?:\/|$)/)?.[1]
  } catch {
    return undefined
  }
}
