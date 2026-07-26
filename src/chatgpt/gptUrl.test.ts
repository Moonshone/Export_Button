import { describe, expect, it } from 'vitest'
import { parseChatGptGptUrl } from './gptUrl'

describe('parseChatGptGptUrl', () => {
  it.each(['/g/g-abc', '/g/g-abc/', '/g/g-abc?model=test', '/g/g-abc#start', '/g/g-abc-name-des-gpts'])('erkennt die GPT-Detailroute %s', (path) => {
    expect(parseChatGptGptUrl(`https://chatgpt.com${path}`)).toMatchObject({ type: 'detail' })
  })

  it.each(['/gpts', '/gpts/', '/gpts/mine', '/gpts/discover', '/gpts/editor', '/gpts/verwaltung/ohne-gpt'])('erkennt %s als GPT-Liste', (path) => {
    expect(parseChatGptGptUrl(`https://chatgpt.com${path}`)).toMatchObject({ type: 'list' })
  })

  it('erkennt nur eine Editorroute mit konkreter ID als Editor', () => {
    expect(parseChatGptGptUrl('https://chatgpt.com/gpts/editor/g-abc?id=x')).toMatchObject({ type: 'editor', id: 'g-abc' })
  })

  it.each(['https://evil.example/g/g-x', 'https://x.chatgpt.com/g/g-x', 'javascript:alert(1)', 'data:text/plain,x', 'https://chatgpt.com:444/g/g-x', 'https://chatgpt.com/g/g-p-PROJEKT-ID', 'https://chatgpt.com/g/g-p-PROJEKT-ID/project', 'https://chatgpt.com/g/g-p-PROJEKT-ID/c/CHAT-ID', 'https://chatgpt.com/g/g-abc/c/CHAT-ID'])('lehnt %s als GPT-URL ab', (url) => {
    expect(parseChatGptGptUrl(url)).toBeUndefined()
  })
})
