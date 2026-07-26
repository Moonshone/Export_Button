import type { ChatGptProject, ProjectExportOptions } from '../chatgpt/projectTypes'
import type { VisibleConversation } from '../chatgpt/conversationReader'
import type { CustomGptExportData, GptExportOptions } from '../chatgpt/gptTypes'

export type DownloadArchiveMessage = { type: 'DOWNLOAD_ARCHIVE'; filename: string; mimeType: 'application/zip'; base64: string }
export type DownloadArchiveResponse = { ok: true; downloadId: number } | { ok: false; error: string }
export type StartProjectExportMessage = { type: 'START_PROJECT_EXPORT'; exportId: string; project: ChatGptProject; options: ProjectExportOptions }
export type ExtractCurrentChatMessage = { type: 'EXTRACT_CURRENT_CHAT' }
export type CancelProjectExportMessage = { type: 'CANCEL_PROJECT_EXPORT'; exportId: string }
export type ProjectExportStatus = 'discovering' | 'exporting' | 'packaging' | 'downloading' | 'completed' | 'cancelled' | 'failed'
export type ProjectExportProgressMessage = { type: 'PROJECT_EXPORT_PROGRESS'; exportId: string; completed: number; total: number; currentChatTitle?: string; status: ProjectExportStatus }
export type ProjectExportResult = { ok: true; exportedChats: number; failedChats: number; downloadId: number } | { ok: false; errorCode: string; message: string }
export type ExtractCurrentChatResponse = { ok: true; conversation: VisibleConversation } | { ok: false; message: string }
export type StartGptExportMessage = { type: 'START_GPT_EXPORT'; exportId: string; gpt: CustomGptExportData; options: GptExportOptions }
export type CancelGptExportMessage = { type: 'CANCEL_GPT_EXPORT'; exportId: string }
export type GptExportStatus = 'discovering' | 'reading-configuration' | 'reading-instructions' | 'reading-knowledge' | 'reading-capabilities' | 'reading-integrations' | 'packaging' | 'downloading' | 'completed' | 'cancelled' | 'failed'
export type GptExportProgressMessage = { type: 'GPT_EXPORT_PROGRESS'; exportId: string; status: GptExportStatus; message?: string }
export type GptExportResult = { ok: true; downloadId: number; complete: boolean; warningCount: number } | { ok: false; errorCode: string; message: string }

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
export function isDownloadArchiveMessage(message: unknown): message is DownloadArchiveMessage { return record(message) && message.type === 'DOWNLOAD_ARCHIVE' && typeof message.filename === 'string' && message.mimeType === 'application/zip' && typeof message.base64 === 'string' }
export function isCancelProjectExportMessage(message: unknown): message is CancelProjectExportMessage { return record(message) && message.type === 'CANCEL_PROJECT_EXPORT' && typeof message.exportId === 'string' && message.exportId.length > 5 }
export function isStartProjectExportMessage(message: unknown): message is StartProjectExportMessage {
  if (!record(message) || message.type !== 'START_PROJECT_EXPORT' || typeof message.exportId !== 'string' || !record(message.project) || !record(message.options)) return false
  const project = message.project; const options = message.options
  return message.exportId.length > 5 && typeof project.title === 'string' && typeof project.url === 'string' && Array.isArray(project.chats) && project.chats.length <= 500 && Array.isArray(project.files) && ['chats', 'projectInformation', 'instructions', 'fileReferences', 'downloadableFiles'].every((key) => typeof options[key] === 'boolean')
}
export function isProgressMessage(message: unknown): message is ProjectExportProgressMessage { return record(message) && message.type === 'PROJECT_EXPORT_PROGRESS' && typeof message.exportId === 'string' && typeof message.completed === 'number' && typeof message.total === 'number' && typeof message.status === 'string' }
export function isGptProgressMessage(message: unknown): message is GptExportProgressMessage { return record(message) && message.type === 'GPT_EXPORT_PROGRESS' && typeof message.exportId === 'string' && typeof message.status === 'string' }
export function isCancelGptExportMessage(message: unknown): message is CancelGptExportMessage { return record(message) && message.type === 'CANCEL_GPT_EXPORT' && typeof message.exportId === 'string' && message.exportId.length > 5 }
export function isStartGptExportMessage(message: unknown): message is StartGptExportMessage {
  if (!record(message) || message.type !== 'START_GPT_EXPORT' || typeof message.exportId !== 'string' || !record(message.gpt) || !record(message.options)) return false
  const options = message.options
  return message.exportId.length > 5 && typeof message.gpt.name === 'string' && typeof message.gpt.url === 'string' && ['gpt-editor', 'gpt-detail'].includes(String(message.gpt.exportSource)) && Array.isArray(message.gpt.conversationStarters) && Array.isArray(message.gpt.knowledgeFiles) && Array.isArray(message.gpt.actions) && Array.isArray(message.gpt.warnings) && ['basicInformation','instructions','conversationStarters','knowledgeReferences','knowledgeDownloads','capabilities','integrations','openApiSchemas','profileImageReference','profileImageDownload'].every((key) => typeof options[key] === 'boolean')
}
