import { createProjectArchive } from './chatgpt/projectExport'
import type { ExportedProjectChat, ProjectExportError } from './chatgpt/projectTypes'
import { safeChatGptUrl } from './chatgpt/projectReader'
import { parseChatGptChatUrl, projectIdFromChatGptUrl } from './chatgpt/chatUrl'
import { isCancelProjectExportMessage, isDownloadArchiveMessage, isStartProjectExportMessage, type DownloadArchiveResponse, type ExtractCurrentChatMessage, type ExtractCurrentChatResponse, type ProjectExportProgressMessage, type ProjectExportResult, type StartProjectExportMessage } from './types/extensionMessages'

interface Job { cancelled: boolean; tabs: Set<number> }
const jobs = new Map<string, Job>()
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
function safeZip(filename: string): boolean { return filename.length > 0 && filename.length <= 200 && filename.endsWith('.zip') && !Array.from(filename).some((character) => character.charCodeAt(0) <= 31) && !/[<>:"/\\|?*]/.test(filename) && !/[. ]$/.test(filename) }
function base64(value: string): boolean { return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value) }
function progress(exportId: string, completed: number, total: number, status: ProjectExportProgressMessage['status'], currentChatTitle?: string): void { void chrome.runtime.sendMessage<ProjectExportProgressMessage, unknown>({ type: 'PROJECT_EXPORT_PROGRESS', exportId, completed, total, status, currentChatTitle }).catch(() => undefined) }
async function close(job: Job, tabId: number): Promise<void> { job.tabs.delete(tabId); await chrome.tabs.remove(tabId).catch(() => undefined) }
async function extract(reference: StartProjectExportMessage['project']['chats'][number], job: Job): Promise<ExportedProjectChat> {
  const parsed = parseChatGptChatUrl(reference.url); if (!parsed) throw new Error('invalid-url')
  const tab = await chrome.tabs.create({ url: parsed.url, active: false }); if (tab.id === undefined) throw new Error('tab')
  job.tabs.add(tab.id)
  try {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      if (job.cancelled) throw new Error('cancelled')
      const current = await chrome.tabs.get(tab.id).catch(() => undefined)
      if (current?.status !== 'complete') { await delay(100); continue }
      try { const response = await Promise.race([chrome.tabs.sendMessage<ExtractCurrentChatMessage, ExtractCurrentChatResponse>(tab.id, { type: 'EXTRACT_CURRENT_CHAT' }), delay(2_000).then(() => { throw new Error('timeout') })]); if (response?.ok && response.conversation.messages.length) return { reference, conversation: response.conversation, exportedAt: new Date().toISOString() } } catch { /* Content script may still be starting. */ }
      await delay(200)
    }
    throw new Error('timeout')
  } finally { await close(job, tab.id) }
}
async function run(message: StartProjectExportMessage): Promise<ProjectExportResult> {
  if (jobs.size) return { ok: false, errorCode: 'EXPORT_RUNNING', message: 'Ein Projekt-Export wird bereits ausgeführt.' }
  const job: Job = { cancelled: false, tabs: new Set() }; jobs.set(message.exportId, job); const chats: ExportedProjectChat[] = []; const errors: ProjectExportError[] = []
  try {
    for (const reference of message.options.chats ? message.project.chats : []) {
      if (job.cancelled) return { ok: false, errorCode: 'CANCELLED', message: 'Der Projekt-Export wurde abgebrochen.' }
      progress(message.exportId, chats.length + errors.length, message.project.chats.length, 'exporting', reference.title)
      let success = false
      for (let retry = 0; retry < 2 && !success; retry += 1) { try { chats.push(await extract(reference, job)); success = true } catch { if (job.cancelled) break } }
      if (!success && !job.cancelled) errors.push({ type: 'chat', title: reference.title, url: reference.url, message: 'Der Chat konnte innerhalb des Zeitlimits nicht geladen werden.' })
    }
    if (job.cancelled) return { ok: false, errorCode: 'CANCELLED', message: 'Der Projekt-Export wurde abgebrochen.' }
    progress(message.exportId, chats.length, message.project.chats.length, 'packaging')
    const archive = await createProjectArchive({ project: message.project, chats, errors, options: message.options, extensionVersion: chrome.runtime.getManifest().version })
    if (job.cancelled) return { ok: false, errorCode: 'CANCELLED', message: 'Der Projekt-Export wurde abgebrochen.' }
    progress(message.exportId, chats.length, message.project.chats.length, 'downloading')
    const downloadId = await chrome.downloads.download({ url: `data:application/zip;base64,${archive.base64}`, filename: archive.filename, saveAs: true })
    progress(message.exportId, chats.length, message.project.chats.length, 'completed'); return { ok: true, exportedChats: chats.length, failedChats: errors.length, downloadId }
  } catch { progress(message.exportId, chats.length, message.project.chats.length, 'failed'); return { ok: false, errorCode: 'EXPORT_FAILED', message: 'Das Projekt konnte nicht exportiert werden. Bitte versuche es erneut.' } }
  finally { await Promise.all([...job.tabs].map((id) => close(job, id))); jobs.delete(message.exportId) }
}
export function handleExtensionMessage(message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void): boolean | undefined {
  if (isCancelProjectExportMessage(message)) { const job = jobs.get(message.exportId); if (job) { job.cancelled = true; void Promise.all([...job.tabs].map((id) => close(job, id))) } sendResponse({ ok: true }); return false }
  if (typeof message === 'object' && message !== null && (message as Record<string, unknown>).type === 'START_PROJECT_EXPORT') {
    const projectId = isStartProjectExportMessage(message) ? projectIdFromChatGptUrl(message.project.url) : undefined
    const invalidChat = isStartProjectExportMessage(message) && message.project.chats.some((chat) => { const parsed = parseChatGptChatUrl(chat.url); return !parsed || (projectId ? parsed.projectId !== projectId : false) })
    if (!isStartProjectExportMessage(message) || !safeChatGptUrl(message.project.url) || invalidChat) { sendResponse({ ok: false, errorCode: 'INVALID_REQUEST', message: 'Die Projekt-Export-Anfrage ist ungültig.' } satisfies ProjectExportResult); return false }
    void run(message).then(sendResponse).catch(() => sendResponse({ ok: false, errorCode: 'EXPORT_FAILED', message: 'Das Projekt konnte nicht exportiert werden. Bitte versuche es erneut.' } satisfies ProjectExportResult)); return true
  }
  if (typeof message !== 'object' || message === null || (message as Record<string, unknown>).type !== 'DOWNLOAD_ARCHIVE') return undefined
  if (!isDownloadArchiveMessage(message) || !safeZip(message.filename) || !base64(message.base64)) { const response: DownloadArchiveResponse = { ok: false, error: 'Die Download-Anfrage ist ungültig.' }; sendResponse(response); return false }
  void chrome.downloads.download({ url: `data:application/zip;base64,${message.base64}`, filename: message.filename, saveAs: true }).then((downloadId) => sendResponse({ ok: true, downloadId } satisfies DownloadArchiveResponse)).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error && /permission/i.test(error.message) ? 'Die Download-Berechtigung fehlt.' : 'Der Download konnte nicht gestartet werden.' } satisfies DownloadArchiveResponse)); return true
}
chrome.runtime.onMessage.addListener(handleExtensionMessage)
