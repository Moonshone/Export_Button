export type ParsedGptUrl = { type: 'detail' | 'editor' | 'list'; id?: string; url: string }
export function parseChatGptGptUrl(value: string): ParsedGptUrl | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port) return undefined
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 2 && parts[0] === 'g' && /^g-[^/]+$/i.test(parts[1]) && !parts[1].startsWith('g-p-')) {
      return { type: 'detail', id: parts[1], url: `${url.origin}${url.pathname}` }
    }
    if (parts[0] === 'gpts') {
      const editorIndex = parts.findIndex((part, index) => index > 0 && ['editor', 'edit', 'configure'].includes(part))
      const routeId = editorIndex >= 0 ? parts[editorIndex + 1] : undefined
      const queryId = url.searchParams.get('gptId') ?? url.searchParams.get('id') ?? undefined
      const id = routeId || queryId
      return editorIndex >= 0 && id
        ? { type: 'editor', id, url: `${url.origin}${url.pathname}` }
        : { type: 'list', url: `${url.origin}${url.pathname}` }
    }
  } catch { return undefined }
  return undefined
}
