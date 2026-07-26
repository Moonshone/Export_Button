import { describe, expect, it } from 'vitest'
import { parseChatGptChatUrl } from './chatUrl'

const projectId = 'g-p-69f849e273fc8191ba4b3e1fb3602502'
const chatId = '6a062758-2cac-8328-bf3b-fe896afe1a54'

describe('parseChatGptChatUrl', () => {
  it('erkennt eine echte Projektchat-URL', () => expect(parseChatGptChatUrl(`https://chatgpt.com/g/${projectId}/c/${chatId}`)).toEqual({ url: `https://chatgpt.com/g/${projectId}/c/${chatId}`, projectId, chatId, type: 'project-chat' }))
  it('erkennt normale, relative und dekorierte Chat-URLs', () => {
    expect(parseChatGptChatUrl(`/c/${chatId}`)).toMatchObject({ chatId, type: 'normal-chat' })
    expect(parseChatGptChatUrl(`/g/${projectId}/c/${chatId}?model=x#antwort`)).toMatchObject({ projectId, chatId, type: 'project-chat' })
  })
  it.each(['https://evil.example/g/g-p-AAA/c/CHAT', 'http://chatgpt.com/c/CHAT', 'https://chatgpt.com.evil.example/c/CHAT', 'not a valid url'])('lehnt ungültige oder fremde URLs ab: %s', (url) => expect(parseChatGptChatUrl(url)).toBeUndefined())
})
