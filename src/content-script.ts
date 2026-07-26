import { readVisibleConversation } from './chatgpt/conversationReader'
import { createCurrentChatArchive } from './chatgpt/currentChatExport'
import { detectChatGptPageContext } from './chatgpt/pageContext'
import { readVisibleGpt } from './chatgpt/gptReader'
import type { CustomGptExportData, GptExportOptions } from './chatgpt/gptTypes'
import { discoverProject, ProjectChatLimitError } from './chatgpt/projectReader'
import type { ChatGptProject, ProjectExportOptions } from './chatgpt/projectTypes'
import { ToastManager } from './services/toast'
import { isGptProgressMessage, isProgressMessage, type CancelGptExportMessage, type CancelProjectExportMessage, type DownloadArchiveMessage, type DownloadArchiveResponse, type ExtractCurrentChatResponse, type GptExportProgressMessage, type GptExportResult, type ProjectExportProgressMessage, type ProjectExportResult, type StartGptExportMessage, type StartProjectExportMessage } from './types/extensionMessages'

export const CONTENT_ROOT_ID = 'chat-export-extension-root'
export const CONTENT_BUTTON_ID = 'chat-export-extension-button'
export type ExportButtonMode = 'hidden' | 'chat-idle' | 'chat-exporting' | 'project-idle' | 'project-discovering' | 'project-exporting' | 'project-cancelling' | 'gpt-idle' | 'gpt-discovering' | 'gpt-exporting' | 'export-cancelling'

let buttonMode: ExportButtonMode = 'hidden'
let exportId: string | undefined
let observer: MutationObserver | undefined
let scheduled = false
let toasts: ToastManager | undefined
let activeDocument: Document | undefined
const navigationWindows = new WeakSet<Window>()

const toast = (message: string, variant: 'info' | 'success' | 'warning' | 'error' | 'progress', id: string = crypto.randomUUID(), persistent = false) => toasts?.show({ id, groupId: id, message, variant, persistent })
const currentButton = (): HTMLButtonElement | undefined => activeDocument?.getElementById(CONTENT_ROOT_ID)?.shadowRoot?.getElementById(CONTENT_BUTTON_ID) as HTMLButtonElement | undefined
const projectTimeout = (chatCount: number): number => Math.min(30 * 60_000, Math.max(60_000, chatCount * 45_000))

export function renderExportButtonState(button: HTMLButtonElement, mode: ExportButtonMode): void {
  const states: Record<ExportButtonMode, { text: string; label: string; hidden: boolean; disabled: boolean; busy: boolean }> = {
    hidden: { text: '', label: 'Export auf dieser Seite nicht verfügbar', hidden: true, disabled: true, busy: false },
    'chat-idle': { text: 'Aktuellen Chat exportieren', label: 'Aktuell geöffnete ChatGPT-Unterhaltung exportieren', hidden: false, disabled: false, busy: false },
    'chat-exporting': { text: 'Aktuellen Chat exportieren', label: 'Aktuell geöffnete ChatGPT-Unterhaltung wird exportiert', hidden: false, disabled: true, busy: true },
    'project-idle': { text: 'Ganzes Projekt exportieren', label: 'Alle Chats des aktuell geöffneten ChatGPT-Projekts exportieren', hidden: false, disabled: false, busy: false },
    'project-discovering': { text: 'Ganzes Projekt exportieren', label: 'ChatGPT-Projekt wird analysiert', hidden: false, disabled: true, busy: true },
    'project-exporting': { text: 'Export abbrechen', label: 'Laufenden Projekt-Export abbrechen', hidden: false, disabled: false, busy: true },
    'project-cancelling': { text: 'Export wird abgebrochen …', label: 'Projekt-Export wird abgebrochen', hidden: false, disabled: true, busy: true },
    'gpt-idle': { text: 'GPT exportieren', label: 'Benutzerdefinierten GPT exportieren', hidden: false, disabled: false, busy: false },
    'gpt-discovering': { text: 'GPT exportieren', label: 'GPT wird analysiert', hidden: false, disabled: true, busy: true },
    'gpt-exporting': { text: 'Export abbrechen', label: 'Laufenden GPT-Export abbrechen', hidden: false, disabled: false, busy: true },
    'export-cancelling': { text: 'Export wird abgebrochen …', label: 'Export wird abgebrochen', hidden: false, disabled: true, busy: true },
  }
  const state = states[mode]
  button.textContent = state.text
  button.hidden = state.hidden
  button.disabled = state.disabled
  button.setAttribute('aria-busy', String(state.busy))
  button.setAttribute('aria-label', state.label)
  button.dataset.mode = mode
  button.classList.toggle('cancel-action', mode === 'project-exporting' || mode === 'project-cancelling' || mode === 'gpt-exporting' || mode === 'export-cancelling')
}

function setButtonMode(mode: ExportButtonMode): void {
  buttonMode = mode
  const button = currentButton()
  if (button) renderExportButtonState(button, mode)
}

export function updateButtonFromCurrentPageContext(documentRef: Document = activeDocument ?? document): void {
  activeDocument = documentRef
  if (exportId && ['project-exporting', 'project-cancelling', 'gpt-exporting', 'export-cancelling'].includes(buttonMode)) return
  const context = detectChatGptPageContext(documentRef)
  setButtonMode(context.type === 'chat' ? 'chat-idle' : context.type === 'project-overview' ? 'project-idle' : context.type === 'gpt-detail' || context.type === 'gpt-editor' ? 'gpt-idle' : 'hidden')
}

function finishProjectExport(activeId?: string): void {
  if (activeId && exportId !== activeId) return
  if (exportId) toasts?.dismiss(exportId)
  exportId = undefined
  updateButtonFromCurrentPageContext()
}

export async function exportCurrentConversation(button: HTMLButtonElement = currentButton()!): Promise<void> {
  if (buttonMode !== 'chat-idle') return
  setButtonMode('chat-exporting')
  try {
    const conversation = readVisibleConversation()
    if (!conversation.messages.length) { toast('In der aktuell geöffneten Seite wurde keine Unterhaltung gefunden.', 'warning'); return }
    toast('Export wird erstellt …', 'progress', 'current-export', true)
    const archive = await createCurrentChatArchive(conversation)
    const response = await chrome.runtime.sendMessage<DownloadArchiveMessage, DownloadArchiveResponse>({ type: 'DOWNLOAD_ARCHIVE', filename: archive.filename, mimeType: 'application/zip', base64: archive.base64 })
    toasts?.dismiss('current-export')
    toast(response.ok ? 'Der Download wurde gestartet.' : response.error, response.ok ? 'success' : 'error')
  } catch {
    toasts?.dismiss('current-export')
    toast('Der Export konnte nicht erstellt werden. Bitte versuche es erneut.', 'error')
  } finally {
    updateButtonFromCurrentPageContext()
    button.focus({ preventScroll: true })
  }
}

function dialog(project: ChatGptProject, trigger: HTMLButtonElement): Promise<ProjectExportOptions | undefined> {
  return new Promise((resolve) => {
    const shadow = trigger.getRootNode() as ShadowRoot
    const overlay = document.createElement('div')
    overlay.className = 'dialog-overlay'
    overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" aria-describedby="project-dialog-description"><h2 id="project-dialog-title">Ganzes Projekt exportieren</h2><p><strong>${project.title.replace(/[<>&]/g, '')}</strong><br>${project.chats.length} Projektchats, ${project.files.length} Dateiverweise</p><p id="project-dialog-description">Die Erweiterung öffnet die Chats dieses Projekts nacheinander, liest die im Browser sichtbaren Inhalte und erstellt daraus lokal eine ZIP-Datei. Es werden keine Daten an einen externen Server übertragen.</p><p>Das ZIP enthält Projektinformationen sowie nummerierte Chatordner mit JSON und Markdown.</p><fieldset><legend>Inhalte</legend><label><input name="chats" type="checkbox" checked> Projektchats exportieren</label><label><input name="projectInformation" type="checkbox" checked> Projektinformationen exportieren</label><label><input name="instructions" type="checkbox" ${project.instructions ? 'checked' : 'disabled'}> Projektanweisungen exportieren, falls verfügbar</label><label><input name="fileReferences" type="checkbox" checked> sichtbare Dateiverweise exportieren</label><label><input name="downloadableFiles" type="checkbox"> tatsächlich herunterladbare Dateien exportieren</label></fieldset><div class="dialog-actions"><button type="button" data-cancel>Abbrechen</button><button type="button" data-confirm>Projekt exportieren</button></div></section>`
    shadow.append(overlay)
    const finish = (result?: ProjectExportOptions) => { overlay.remove(); trigger.focus({ preventScroll: true }); resolve(result) }
    const cancel = () => finish()
    overlay.querySelector('[data-cancel]')?.addEventListener('click', cancel)
    overlay.addEventListener('keydown', (event) => { if (event.key === 'Escape') cancel() })
    overlay.querySelector('[data-confirm]')?.addEventListener('click', () => {
      const checked = (name: string) => (overlay.querySelector(`[name="${name}"]`) as HTMLInputElement).checked
      finish({ chats: checked('chats'), projectInformation: checked('projectInformation'), instructions: checked('instructions'), fileReferences: checked('fileReferences'), downloadableFiles: checked('downloadableFiles') })
    })
    ;(overlay.querySelector('[data-cancel]') as HTMLButtonElement).focus()
  })
}

export async function exportProject(trigger: HTMLButtonElement = currentButton()!): Promise<void> {
  if (buttonMode !== 'project-idle') return
  setButtonMode('project-discovering')
  toast('Projekt wird analysiert …', 'progress', 'project-discovery', true)
  let project: ChatGptProject | undefined
  try { project = await discoverProject(activeDocument ?? document) }
  catch (error) {
    toasts?.dismiss('project-discovery')
    toast(error instanceof ProjectChatLimitError ? error.message : 'Das Projekt konnte nicht analysiert werden.', 'error')
    updateButtonFromCurrentPageContext()
    return
  }
  toasts?.dismiss('project-discovery')
  if (!project) { toast('Auf dieser Seite wurde kein ChatGPT-Projekt erkannt.', 'warning'); updateButtonFromCurrentPageContext(); return }
  if (!project.chats.length) { toast('In diesem Projekt wurden keine exportierbaren Chats gefunden.', 'warning'); updateButtonFromCurrentPageContext(); return }
  toast(`${project.chats.length} Projekt-Chats wurden gefunden.`, 'info')
  const options = await dialog(project, trigger)
  if (!options) { updateButtonFromCurrentPageContext(); return }

  exportId = crypto.randomUUID()
  const activeId = exportId
  setButtonMode('project-exporting')
  toast('Projekt wird analysiert …', 'progress', activeId, true)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('project-timeout')), projectTimeout(project.chats.length)) })
    const result = await Promise.race([chrome.runtime.sendMessage<StartProjectExportMessage, ProjectExportResult>({ type: 'START_PROJECT_EXPORT', exportId: activeId, project, options }), timeout])
    if (exportId !== activeId) return
    if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean') throw new Error('invalid-response')
    if (!result.ok) toast(result.message, result.errorCode === 'CANCELLED' ? 'info' : 'error')
    else if (result.failedChats) toast(`${result.exportedChats} von ${project.chats.length} Chats wurden exportiert. ${result.failedChats === 1 ? 'Ein Chat konnte nicht gelesen werden.' : `${result.failedChats} Chats konnten nicht gelesen werden.`}`, 'warning')
    else toast('Der Projekt-Download wurde gestartet.', 'success')
  } catch (error) {
    if (exportId !== activeId) return
    if (error instanceof Error && error.message === 'project-timeout') {
      void chrome.runtime.sendMessage<CancelProjectExportMessage, unknown>({ type: 'CANCEL_PROJECT_EXPORT', exportId: activeId })
      toast('Der Projekt-Export hat zu lange gedauert und wurde beendet.', 'error')
    } else toast('Das Projekt konnte nicht exportiert werden. Bitte versuche es erneut.', 'error')
  } finally {
    if (timer) clearTimeout(timer)
    finishProjectExport(activeId)
  }
}

export async function cancelProjectExport(): Promise<void> {
  if (buttonMode !== 'project-exporting' || !exportId) return
  const activeId = exportId
  setButtonMode('project-cancelling')
  try {
    await chrome.runtime.sendMessage<CancelProjectExportMessage, unknown>({ type: 'CANCEL_PROJECT_EXPORT', exportId: activeId })
    if (exportId === activeId) toast('Der Projekt-Export wurde abgebrochen.', 'info')
  } catch {
    if (exportId === activeId) toast('Das Projekt konnte nicht exportiert werden. Bitte versuche es erneut.', 'error')
  } finally { finishProjectExport(activeId) }
}

function gptDialog(gpt: CustomGptExportData, trigger: HTMLButtonElement): Promise<GptExportOptions | undefined> {
  return new Promise((resolve) => { const shadow = trigger.getRootNode() as ShadowRoot; const overlay = document.createElement('div'); overlay.className = 'dialog-overlay'; const abilityCount = Object.entries(gpt.capabilities).filter(([key, value]) => key !== 'otherVisibleCapabilities' && value === true).length + gpt.capabilities.otherVisibleCapabilities.length; overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="gpt-dialog-title"><h2 id="gpt-dialog-title">GPT exportieren</h2><p><strong>${gpt.name.replace(/[<>&]/g, '')}</strong><br>Exportquelle: ${gpt.exportSource === 'gpt-editor' ? 'GPT-Editor' : 'öffentliche/geteilte GPT-Seite'}<br>${gpt.conversationStarters.length} Gesprächseinstiege, ${gpt.knowledgeFiles.length} Wissensdateien, ${gpt.actions.length} Aktionen, ${abilityCount} erkannte Fähigkeiten</p><p>Die Erweiterung liest ausschließlich die über die normale ChatGPT-Oberfläche zugänglichen GPT-Informationen und erstellt daraus lokal eine strukturierte ZIP-Datei. Es werden keine Daten an einen externen Server übertragen.</p><fieldset><legend>Inhalte</legend>${[['basicInformation','GPT-Grundinformationen exportieren',true],['instructions','GPT-Anweisungen exportieren, falls zugänglich',true],['conversationStarters','Gesprächseinstiege exportieren',true],['knowledgeReferences','Wissensdateiverweise exportieren',true],['knowledgeDownloads','tatsächliche Wissensdateien exportieren',false],['capabilities','Fähigkeiten exportieren',true],['integrations','App- oder Aktionsmetadaten exportieren',true],['openApiSchemas','sichtbares OpenAPI-Schema exportieren',true],['profileImageReference','Profilbildverweis exportieren',true],['profileImageDownload','tatsächliches Profilbild exportieren',false]].map(([name,label,checked]) => `<label><input name="${name}" type="checkbox" ${checked ? 'checked' : ''}> ${label}</label>`).join('')}</fieldset><div class="dialog-actions"><button data-cancel>Abbrechen</button><button data-confirm>GPT exportieren</button></div></section>`; shadow.append(overlay); const finish = (value?: GptExportOptions) => { overlay.remove(); trigger.focus({ preventScroll: true }); resolve(value) }; overlay.querySelector('[data-cancel]')?.addEventListener('click', () => finish()); overlay.querySelector('[data-confirm]')?.addEventListener('click', () => { const checked = (name: string) => (overlay.querySelector(`[name="${name}"]`) as HTMLInputElement).checked; finish({ basicInformation: checked('basicInformation'), instructions: checked('instructions'), conversationStarters: checked('conversationStarters'), knowledgeReferences: checked('knowledgeReferences'), knowledgeDownloads: checked('knowledgeDownloads'), capabilities: checked('capabilities'), integrations: checked('integrations'), openApiSchemas: checked('openApiSchemas'), profileImageReference: checked('profileImageReference'), profileImageDownload: checked('profileImageDownload') }) }); (overlay.querySelector('[data-cancel]') as HTMLButtonElement).focus() })
}

export async function exportGpt(trigger: HTMLButtonElement = currentButton()!): Promise<void> {
  if (buttonMode !== 'gpt-idle') return; setButtonMode('gpt-discovering'); toast('GPT wird analysiert …', 'progress', 'gpt-discovery', true)
  const context = detectChatGptPageContext(activeDocument ?? document); const source = context.type === 'gpt-editor' ? 'gpt-editor' : context.type === 'gpt-detail' ? 'gpt-detail' : undefined; const gptId = context.type === 'gpt-editor' || context.type === 'gpt-detail' ? context.gptId : undefined; const gpt = source ? readVisibleGpt(activeDocument ?? document, source, gptId) : undefined; toasts?.dismiss('gpt-discovery')
  if (!gpt) { toast('Auf dieser Seite wurde kein exportierbarer GPT erkannt.', 'warning'); updateButtonFromCurrentPageContext(); return }
  const options = await gptDialog(gpt, trigger); if (!options) { updateButtonFromCurrentPageContext(); return }
  exportId = crypto.randomUUID(); const activeId = exportId; setButtonMode('gpt-exporting'); toast('GPT-Konfiguration wird gelesen …', 'progress', activeId, true)
  try { const result = await chrome.runtime.sendMessage<StartGptExportMessage, GptExportResult>({ type: 'START_GPT_EXPORT', exportId: activeId, gpt, options }); if (exportId !== activeId) return; if (!result.ok) toast(result.message, result.errorCode === 'CANCELLED' ? 'info' : 'error'); else if (gpt.exportSource === 'gpt-detail') toast('Es wurden nur öffentlich sichtbare GPT-Informationen exportiert.', 'warning'); else if (result.warningCount) toast('Der GPT wurde exportiert. Einige nicht zugängliche Inhalte wurden ausgelassen.', 'warning'); else toast('Der GPT-Download wurde gestartet.', 'success') } catch { toast('Der GPT konnte nicht exportiert werden. Bitte versuche es erneut.', 'error') } finally { finishProjectExport(activeId) }
}
export async function cancelGptExport(): Promise<void> { if (buttonMode !== 'gpt-exporting' || !exportId) return; const id = exportId; setButtonMode('export-cancelling'); try { await chrome.runtime.sendMessage<CancelGptExportMessage, unknown>({ type: 'CANCEL_GPT_EXPORT', exportId: id }); toast('Der GPT-Export wurde abgebrochen.', 'info') } finally { finishProjectExport(id) } }

export async function handleContextualExportButtonClick(): Promise<void> {
  const button = currentButton()
  if (!button) return
  switch (buttonMode) {
    case 'chat-idle': await exportCurrentConversation(button); break
    case 'project-idle': await exportProject(button); break
    case 'project-exporting': await cancelProjectExport(); break
    case 'gpt-idle': await exportGpt(button); break
    case 'gpt-exporting': await cancelGptExport(); break
  }
}

function progress(message: ProjectExportProgressMessage): void {
  if (!exportId || message.exportId !== exportId) return
  const text = message.status === 'exporting' ? `Chat ${message.completed + 1} von ${message.total} wird exportiert: ${message.currentChatTitle ?? ''}` : message.status === 'packaging' ? 'ZIP-Datei wird erstellt …' : message.status === 'downloading' ? 'Download wird gestartet …' : 'Projekt wird analysiert …'
  if (!['completed', 'cancelled', 'failed'].includes(message.status)) toast(text, 'progress', message.exportId, true)
}
function gptProgress(message: GptExportProgressMessage): void { if (!exportId || message.exportId !== exportId) return; const labels: Partial<Record<GptExportProgressMessage['status'], string>> = { discovering: 'GPT wird analysiert …', 'reading-configuration': 'GPT-Konfiguration wird gelesen …', 'reading-instructions': 'GPT-Anweisungen werden gelesen …', 'reading-knowledge': 'Wissensdateien werden erfasst …', 'reading-capabilities': 'Fähigkeiten werden erfasst …', 'reading-integrations': 'Apps und Aktionen werden erfasst …', packaging: 'ZIP-Datei wird erstellt …', downloading: 'Download wird gestartet …' }; const label = labels[message.status]; if (label) toast(label, 'progress', message.exportId, true) }

const SHADOW_STYLES = `:host{all:initial;position:fixed;right:14px;bottom:80px;z-index:10000;font:12px/1.4 system-ui,sans-serif}.toast-region{display:grid;gap:6px;margin-bottom:8px;width:min(320px,calc(100vw - 28px))}.toast{display:flex;gap:8px;align-items:flex-start;padding:10px;border-left:4px solid #3578b8;border-radius:8px;background:#fff;color:#17201d;box-shadow:0 3px 14px #0003;overflow-wrap:anywhere}.toast[data-variant=success]{border-color:#087a58}.toast[data-variant=warning]{border-color:#ba7400}.toast[data-variant=error]{border-color:#b42318}.toast-close{margin-left:auto;border:0;background:transparent;color:inherit;font-size:18px;cursor:pointer}.actions{display:grid;justify-items:end;gap:6px}.export-action{all:initial;box-sizing:border-box;display:block;max-width: min(175px, calc(100vw - 24px));padding: 7px 10px;border:1px solid #3f3f46;border-radius:999px;background:#3f3f46;color:#ffffff;box-shadow:0 2px 9px #0003;cursor:pointer;font: 600 11px/1.25 system-ui, sans-serif;text-align:center}.export-action:hover:not(:disabled){border-color:#27272a;background:#27272a}.export-action:active:not(:disabled){border-color:#18181b;background:#18181b}.export-action:focus-visible,.toast:focus-visible,.dialog button:focus-visible{outline:3px solid #f5a623;outline-offset:2px}.export-action:disabled{cursor:wait;opacity:.65}.export-action.cancel-action{border-color:#9f2d26;background:#9f2d26}.export-action.cancel-action:hover:not(:disabled){border-color:#84231e;background:#84231e}.export-action.cancel-action:active:not(:disabled){border-color:#6f1d19;background:#6f1d19}.export-action[data-mode=project-cancelling]{opacity:.65}.dialog-overlay{position:fixed;inset:0;display:grid;place-items:center;background:#0008}.dialog{box-sizing:border-box;width:min(520px,calc(100vw - 30px));max-height:calc(100vh - 30px);overflow:auto;padding:20px;border-radius:12px;background:#fff;color:#17201d;box-shadow:0 8px 30px #0005}.dialog h2{font-size:20px}.dialog label{display:block;margin:8px 0}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.dialog button{padding:8px 12px}@media(prefers-color-scheme:dark){.toast,.dialog{background:#202925;color:#edf3f0}}`

export function ensureExportButton(documentRef: Document = document): HTMLElement {
  activeDocument = documentRef
  const existing = documentRef.getElementById(CONTENT_ROOT_ID)
  if (existing) { updateButtonFromCurrentPageContext(documentRef); return existing }
  const host = documentRef.createElement('div')
  host.id = CONTENT_ROOT_ID
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<style>${SHADOW_STYLES}</style><div class="toast-region" aria-label="Benachrichtigungen"></div><div class="actions"></div>`
  const button = documentRef.createElement('button')
  button.id = CONTENT_BUTTON_ID
  button.className = 'export-action'
  button.type = 'button'
  button.addEventListener('click', () => void handleContextualExportButtonClick())
  shadow.querySelector('.actions')?.append(button)
  documentRef.body.append(host)
  toasts = new ToastManager(shadow.querySelector('.toast-region') as HTMLElement)
  updateButtonFromCurrentPageContext(documentRef)
  return host
}

export function startContentScript(documentRef: Document = document): MutationObserver {
  ensureExportButton(documentRef)
  const windowRef = documentRef.defaultView
  if (windowRef && !navigationWindows.has(windowRef)) {
    navigationWindows.add(windowRef)
    const refresh = () => queueMicrotask(() => updateButtonFromCurrentPageContext(documentRef))
    windowRef.addEventListener('popstate', refresh)
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = windowRef.history[method].bind(windowRef.history)
      windowRef.history[method] = ((data: unknown, unused: string, url?: string | URL | null) => {
        original(data, unused, url)
        refresh()
      }) as History[typeof method]
    }
  }
  if (observer) return observer
  observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => { scheduled = false; ensureExportButton(documentRef); updateButtonFromCurrentPageContext(documentRef) })
  })
  observer.observe(documentRef.body, { childList: true, subtree: true })
  return observer
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message === 'object' && message !== null && (message as Record<string, unknown>).type === 'EXTRACT_CURRENT_CHAT') {
    const conversation = readVisibleConversation()
    const response: ExtractCurrentChatResponse = conversation.messages.length ? { ok: true, conversation } : { ok: false, message: 'Keine sichtbare Unterhaltung gefunden.' }
    sendResponse(response)
    return false
  }
  if (isProgressMessage(message)) progress(message)
  if (isGptProgressMessage(message)) gptProgress(message)
  return undefined
})

if (typeof document !== 'undefined' && document.body) startContentScript()
