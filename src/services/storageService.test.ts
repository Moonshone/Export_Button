import { beforeEach, describe, expect, it } from 'vitest'
import type { Conversation } from '../types/chat'
import {
  CONVERSATIONS_STORAGE_KEY,
  ConversationStorageError,
  clearAllConversations,
  createConversation,
  deleteConversation,
  loadConversations,
  saveConversations,
  updateConversation,
} from './storageService'

const conversation: Conversation = {
  id: 'chat-1',
  title: 'Lokaler Chat',
  createdAt: '2026-07-26T12:00:00.000Z',
  updatedAt: '2026-07-26T12:00:00.000Z',
  messages: [
    {
      id: 'message-1',
      role: 'user',
      content: 'Hallo',
      createdAt: '2026-07-26T12:00:00.000Z',
    },
  ],
}

describe('storageService', () => {
  beforeEach(() => localStorage.clear())

  it('speichert und laedt validierte Chats unter dem eigenen Schluessel', () => {
    localStorage.setItem('fremde-daten', 'bleiben erhalten')
    saveConversations([conversation])

    expect(loadConversations()).toEqual([conversation])
    expect(localStorage.getItem('fremde-daten')).toBe('bleiben erhalten')
  })

  it('erstellt und aktualisiert einen Chat mit ISO-Zeitangaben', () => {
    const created = createConversation('Neuer Chat')
    const updated = updateConversation(created.id, { title: 'Neuer Titel' })

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt)
    expect(updated.title).toBe('Neuer Titel')
    expect(loadConversations()).toEqual([updated])
  })

  it('loescht einzelne und anschliessend alle Chats', () => {
    saveConversations([conversation])

    expect(deleteConversation(conversation.id)).toBe(true)
    expect(deleteConversation('nicht-vorhanden')).toBe(false)
    saveConversations([conversation])
    clearAllConversations()

    expect(loadConversations()).toEqual([])
    expect(localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBeNull()
  })

  it('meldet beschaedigtes JSON und ueberschreibt es nicht', () => {
    const damaged = '{kein gueltiges JSON'
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, damaged)

    expect(() => loadConversations()).toThrow(ConversationStorageError)
    expect(() => loadConversations()).toThrow(/beschaedigt/)
    expect(localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBe(damaged)
  })

  it('weist ungueltige gespeicherte Daten zurueck', () => {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([{ id: 'unvollstaendig' }]))

    expect(() => loadConversations()).toThrow(/ungueltiges Format/)
  })
})
