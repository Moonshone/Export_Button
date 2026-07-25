import type { Conversation } from '../types/chat'

export const sampleConversations: Conversation[] = [
  {
    id: 'conversation-demo-1',
    title: 'Export-Button planen',
    createdAt: '2026-07-26T10:00:00.000Z',
    updatedAt: '2026-07-26T10:05:00.000Z',
    messages: [
      {
        id: 'message-demo-1',
        role: 'user',
        content: 'Wie kann ich meine Chatdaten lokal exportieren?',
        createdAt: '2026-07-26T10:00:00.000Z',
      },
      {
        id: 'message-demo-2',
        role: 'assistant',
        content: 'Die Anwendung kann im Browser eine ZIP-Datei erzeugen.',
        createdAt: '2026-07-26T10:00:10.000Z',
      },
    ],
  },
]
