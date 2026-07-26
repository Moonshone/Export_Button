export type ParsedGptUrl = { type: 'detail' | 'editor' | 'list'; id?: string; url: string }
export function parseChatGptGptUrl(value: string): ParsedGptUrl | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port) return undefined
    const parts = url.pathname.split('/').filter(Boolean)
    const g = parts.indexOf('g')
    if (g >= 0 && parts[g + 1] && !parts[g + 1].startsWith('g-p-') && !parts.includes('c')) return { type: 'detail', id: parts[g + 1], url: `${url.origin}${url.pathname}` }
    const editor = parts.indexOf('gpts')
    if (editor >= 0) {
      const tail = parts.slice(editor + 1)
      if (!tail.length || (tail.length === 1 && ['mine', 'editor', 'discover'].includes(tail[0]))) return { type: 'list', url: `${url.origin}${url.pathname}` }
      const id = tail.find((part) => !['editor', 'edit', 'configure'].includes(part)) ?? url.searchParams.get('gptId') ?? url.searchParams.get('id')
      return id || tail.some((part) => ['editor', 'edit', 'configure'].includes(part)) ? { type: 'editor', id: id ?? undefined, url: `${url.origin}${url.pathname}` } : { type: 'list', url: `${url.origin}${url.pathname}` }
    }
  } catch { return undefined }
  return undefined
}
