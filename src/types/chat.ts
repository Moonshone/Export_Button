export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}

// Bestehende Importe bleiben kompatibel, waehrend das Datenmodell `Message` heisst.
export type ChatMessage = Message

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}
