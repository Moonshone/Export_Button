import { readVisibleConversation } from './chatgpt/conversationReader'
import { createCurrentChatArchive } from './chatgpt/currentChatExport'
import type { DownloadArchiveMessage, DownloadArchiveResponse } from './types/extensionMessages'

export const CONTENT_ROOT_ID = 'chat-export-extension-root'
export const CONTENT_BUTTON_ID = 'chat-export-extension-button'
const EMPTY_MESSAGE = 'In der aktuell geöffneten Seite wurde keine Unterhaltung gefunden.'

let exporting = false
let observer: MutationObserver | undefined
let scheduled = false

function setButtonState(button: HTMLButtonElement, text: string, disabled: boolean) {
  button.textContent = text
  button.disabled = disabled
}

export async function exportCurrentConversation(button: HTMLButtonElement): Promise<void> {
  if (exporting) return
  exporting = true
  setButtonState(button, 'Export wird erstellt …', true)
  try {
    const conversation = readVisibleConversation()
    if (conversation.messages.length === 0) {
      setButtonState(button, EMPTY_MESSAGE, false)
      return
    }
    let archive: Awaited<ReturnType<typeof createCurrentChatArchive>>
    try {
      archive = await createCurrentChatArchive(conversation)
    } catch {
      setButtonState(button, 'Die ZIP-Datei konnte nicht erstellt werden.', false)
      return
    }
    const message: DownloadArchiveMessage = {
      type: 'DOWNLOAD_ARCHIVE',
      filename: archive.filename,
      mimeType: 'application/zip',
      base64: archive.base64,
    }
    let response: DownloadArchiveResponse
    try {
      response = await chrome.runtime.sendMessage<DownloadArchiveMessage, DownloadArchiveResponse>(message)
    } catch {
      setButtonState(button, 'Der Service Worker ist nicht erreichbar.', false)
      return
    }
    if (!response?.ok) {
      setButtonState(button, response?.error || 'Der Download konnte nicht gestartet werden.', false)
      return
    }
    setButtonState(button, 'Download wurde gestartet.', false)
  } catch {
    setButtonState(button, 'Der Export konnte nicht erstellt werden. Bitte versuche es erneut.', false)
  } finally {
    exporting = false
  }
}

export function ensureExportButton(documentRef: Document = document): HTMLElement {
  const existing = documentRef.getElementById(CONTENT_ROOT_ID)
  if (existing) return existing
  const host = documentRef.createElement('div')
  host.id = CONTENT_ROOT_ID
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<style>
    :host { all: initial; position: fixed; right: 14px; bottom: 80px; z-index: 10000; }
    button { all: initial; box-sizing: border-box; display: block; max-width: min(175px, calc(100vw - 24px)); padding: 7px 10px; border: 1px solid #0b6b4f; border-radius: 999px; background: #087a58; color: white; box-shadow: 0 2px 9px rgb(0 0 0 / 20%); cursor: pointer; font: 600 11px/1.25 system-ui, sans-serif; text-align: center; }
    button:hover { background: #066548; } button:focus-visible { outline: 3px solid #f5a623; outline-offset: 3px; } button:disabled { cursor: wait; opacity: .8; }
    @media (max-width: 480px) { :host { right: 10px; bottom: 68px; } button { padding: 7px 9px; font-size: 11px; } }
    @media (prefers-color-scheme: dark) { button { border-color: #61d6b1; background: #126b55; } button:hover { background: #178269; } }
  </style>`
  const button = documentRef.createElement('button')
  button.id = CONTENT_BUTTON_ID
  button.type = 'button'
  button.textContent = 'Aktuellen Chat exportieren'
  button.setAttribute('aria-label', 'Aktuell geöffnete ChatGPT-Unterhaltung exportieren')
  button.addEventListener('click', () => void exportCurrentConversation(button))
  shadow.append(button)
  documentRef.body.append(host)
  return host
}

export function startContentScript(documentRef: Document = document): MutationObserver {
  ensureExportButton(documentRef)
  if (observer) return observer
  observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => { scheduled = false; ensureExportButton(documentRef) })
  })
  observer.observe(documentRef.body, { childList: true, subtree: true })
  return observer
}

if (typeof document !== 'undefined' && document.body) startContentScript()
