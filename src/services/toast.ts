export type ToastVariant = 'info' | 'success' | 'warning' | 'error' | 'progress'
export interface ToastMessage { id: string; message: string; variant: ToastVariant; durationMs?: number; persistent?: boolean; groupId?: string }
export function calculateToastDuration(message: string): number { return Math.min(15_000, Math.max(3_000, 3_000 + message.length * 45)) }

interface ActiveToast { message: ToastMessage; element: HTMLElement; timer?: number; remaining: number; started: number }
export class ToastManager {
  private active: ActiveToast[] = []; private queue: ToastMessage[] = []
  constructor(private readonly container: HTMLElement, private readonly maxVisible = 3) {}
  show(message: ToastMessage): void {
    const existing = this.active.find((item) => (message.groupId && (item.message.groupId === message.groupId || item.message.id === message.groupId)) || item.message.id === message.id)
    if (existing) { existing.message = message; existing.element.querySelector('[data-toast-message]')!.textContent = message.message; existing.element.dataset.variant = message.variant; this.restart(existing); return }
    if (this.active.some((item) => item.message.message === message.message) || this.queue.some((item) => item.message === message.message)) return
    if (this.active.length >= this.maxVisible) { this.queue.push(message); return }
    this.mount(message)
  }
  dismiss(id: string): void { const index = this.active.findIndex((item) => item.message.id === id || item.message.groupId === id); if (index < 0) return; const [item] = this.active.splice(index, 1); if (item.timer) clearTimeout(item.timer); item.element.remove(); const next = this.queue.shift(); if (next) this.mount(next) }
  private mount(message: ToastMessage): void {
    const element = document.createElement('div'); element.className = 'toast'; element.dataset.variant = message.variant; element.tabIndex = 0; element.setAttribute('role', message.variant === 'error' ? 'alert' : 'status'); element.setAttribute('aria-live', message.variant === 'error' ? 'assertive' : 'polite')
    const text = document.createElement('span'); text.dataset.toastMessage = ''; text.textContent = message.message
    const close = document.createElement('button'); close.type = 'button'; close.className = 'toast-close'; close.setAttribute('aria-label', 'Nachricht schließen'); close.textContent = '×'
    element.append(text, close); const item: ActiveToast = { message, element, remaining: message.durationMs ?? calculateToastDuration(message.message), started: Date.now() }; this.active.push(item); this.container.append(element)
    close.addEventListener('click', () => this.dismiss(message.id)); element.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.dismiss(message.id) }); element.addEventListener('mouseenter', () => this.pause(item)); element.addEventListener('mouseleave', () => this.restart(item)); element.addEventListener('focusin', () => this.pause(item)); element.addEventListener('focusout', () => this.restart(item)); this.restart(item)
  }
  private pause(item: ActiveToast): void { if (item.timer) { clearTimeout(item.timer); item.timer = undefined; item.remaining = Math.max(0, item.remaining - (Date.now() - item.started)) } }
  private restart(item: ActiveToast): void { if (item.timer) clearTimeout(item.timer); if (item.message.persistent || item.message.variant === 'progress') return; item.remaining = item.message.durationMs ?? calculateToastDuration(item.message.message); item.started = Date.now(); item.timer = window.setTimeout(() => this.dismiss(item.message.id), item.remaining) }
}
