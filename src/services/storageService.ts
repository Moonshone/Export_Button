import type { Conversation, Message } from '../types/chat'

export const CONVERSATIONS_STORAGE_KEY = 'lokaler-chat-export:conversations:v1'

export class ConversationStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConversationStorageError'
  }
}

type ConversationChanges = Partial<Pick<Conversation, 'title' | 'messages'>>

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Record<string, unknown>
  return (
    typeof message.id === 'string' &&
    message.id.length > 0 &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    isIsoDate(message.createdAt)
  )
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false

  const conversation = value as Record<string, unknown>
  return (
    typeof conversation.id === 'string' &&
    conversation.id.length > 0 &&
    typeof conversation.title === 'string' &&
    isIsoDate(conversation.createdAt) &&
    isIsoDate(conversation.updatedAt) &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isMessage)
  )
}

function validateConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value) || !value.every(isConversation)) {
    throw new ConversationStorageError(
      'Die lokal gespeicherten Chats haben ein ungueltiges Format. Die Daten wurden nicht veraendert.',
    )
  }

  return value
}

function createId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  if (typeof crypto.getRandomValues !== 'function') {
    throw new ConversationStorageError(
      'Dieser Browser kann keine sicheren Chat-IDs erzeugen.',
    )
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

  return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)].map((part) => part.join('')).join('-')
}

export function loadConversations(): Conversation[] {
  const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
  if (stored === null) return []

  try {
    return validateConversations(JSON.parse(stored))
  } catch (error) {
    if (error instanceof ConversationStorageError) throw error
    throw new ConversationStorageError(
      'Die lokal gespeicherten Chats sind beschaedigt und konnten nicht gelesen werden. Die Daten wurden nicht veraendert.',
      { cause: error },
    )
  }
}

export function saveConversations(conversations: Conversation[]): void {
  const validated = validateConversations(conversations)
  localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(validated))
}

export function createConversation(title: string, messages: Message[] = []): Conversation {
  const conversations = loadConversations()
  const now = new Date().toISOString()
  const conversation: Conversation = {
    id: createId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages,
  }

  saveConversations([...conversations, conversation])
  return conversation
}

export function updateConversation(id: string, changes: ConversationChanges): Conversation {
  const conversations = loadConversations()
  const index = conversations.findIndex((conversation) => conversation.id === id)
  if (index === -1) {
    throw new ConversationStorageError(`Chat mit der ID "${id}" wurde nicht gefunden.`)
  }

  const updated = {
    ...conversations[index],
    ...changes,
    id,
    createdAt: conversations[index].createdAt,
    updatedAt: new Date().toISOString(),
  }
  const nextConversations = [...conversations]
  nextConversations[index] = updated
  saveConversations(nextConversations)
  return updated
}

export function deleteConversation(id: string): boolean {
  const conversations = loadConversations()
  const remaining = conversations.filter((conversation) => conversation.id !== id)
  if (remaining.length === conversations.length) return false

  saveConversations(remaining)
  return true
}

export function clearAllConversations(): void {
  localStorage.removeItem(CONVERSATIONS_STORAGE_KEY)
}
