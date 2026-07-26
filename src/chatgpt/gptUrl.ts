export type ParsedGptUrl = { type: 'detail' | 'editor' | 'list'; id?: string; url: string }
export function parseChatGptGptUrl(value: string): ParsedGptUrl | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port) return undefined
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 2 && parts[0] === 'g' && /^g-[^/]+$/i.test(parts[1]) && !parts[1].startsWith('g-p-')) {
      return { type: 'detail', id: parts[1], url: `${url.origin}${url.pathname}` }
    }
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
