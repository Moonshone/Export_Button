import type { Conversation, Message } from '../types/chat'

export const CONVERSATIONS_STORAGE_KEY = 'conversations'

export class ConversationStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConversationStorageError'
  }
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  return typeof message.id === 'string' && message.id.length > 0 &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' && isIsoDate(message.createdAt)
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false
  const conversation = value as Record<string, unknown>
  return typeof conversation.id === 'string' && conversation.id.length > 0 &&
    typeof conversation.title === 'string' && isIsoDate(conversation.createdAt) &&
    isIsoDate(conversation.updatedAt) && Array.isArray(conversation.messages) &&
    conversation.messages.every(isMessage)
}

function validateConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value) || !value.every(isConversation)) {
    throw new ConversationStorageError('Die gespeicherten Chats haben ein ungültiges Format.')
  }
  return value
}

function storage(): chrome.storage.StorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new ConversationStorageError('Der lokale Erweiterungsspeicher ist nicht verfügbar.')
  }
  return chrome.storage.local
}

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const result = await storage().get(CONVERSATIONS_STORAGE_KEY)
    const stored = result[CONVERSATIONS_STORAGE_KEY]
    return stored === undefined ? [] : validateConversations(stored)
  } catch (error) {
    if (error instanceof ConversationStorageError) throw error
    throw new ConversationStorageError('Die gespeicherten Chats konnten nicht geladen werden.', { cause: error })
  }
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  try {
    await storage().set({ [CONVERSATIONS_STORAGE_KEY]: validateConversations(conversations) })
  } catch (error) {
    if (error instanceof ConversationStorageError) throw error
    throw new ConversationStorageError('Die Chats konnten nicht gespeichert werden.', { cause: error })
  }
}

export async function clearConversations(): Promise<void> {
  try {
    await storage().remove(CONVERSATIONS_STORAGE_KEY)
  } catch (error) {
    throw new ConversationStorageError('Die gespeicherten Chats konnten nicht gelöscht werden.', { cause: error })
  }
}
