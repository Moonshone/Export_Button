import type { VisibleConversation } from './conversationReader'

export interface ProjectChatReference { id?: string; title: string; url: string; position: number }
export interface ProjectFileReference { id?: string; name: string; url?: string; source: 'project' | 'chat' | 'unknown'; downloadable: boolean; relatedChatTitle?: string }
export interface ChatGptProject { id?: string; title: string; url: string; instructions?: string; chats: ProjectChatReference[]; files: ProjectFileReference[] }
export interface ProjectExportOptions { chats: boolean; projectInformation: boolean; instructions: boolean; fileReferences: boolean; downloadableFiles: boolean }
export interface ExportedProjectChat { reference: ProjectChatReference; conversation: VisibleConversation; exportedAt: string }
export interface ProjectExportError { type: 'chat' | 'file' | 'project'; title?: string; name?: string; url?: string; message: string }
