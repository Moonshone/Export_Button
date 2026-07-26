import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '../types/chat'
import { clearConversations, loadConversations, saveConversations } from './storageService'

const conversations: Conversation[] = [{
  id: 'c1', title: 'Chat', createdAt: '2026-07-26T10:00:00.000Z',
  updatedAt: '2026-07-26T10:00:00.000Z', messages: [],
}]

describe('Extension-Storage-Service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lädt Chats aus chrome.storage.local', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ conversations })
    await expect(loadConversations()).resolves.toEqual(conversations)
    expect(chrome.storage.local.get).toHaveBeenCalledWith('conversations')
  })

  it('speichert Chats in chrome.storage.local', async () => {
    await saveConversations(conversations)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ conversations })
  })

  it('leert ausschließlich die gespeicherten Chats', async () => {
    await clearConversations()
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('conversations')
  })

  it('kapselt Fehler der Storage-API', async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValue(new Error('API-Fehler'))
    await expect(loadConversations()).rejects.toThrow('konnten nicht geladen werden')
  })
})
