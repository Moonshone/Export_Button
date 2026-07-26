import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

const local = {
  get: vi.fn<(keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>>().mockResolvedValue({}),
  set: vi.fn<(items: Record<string, unknown>) => Promise<void>>().mockResolvedValue(undefined),
  remove: vi.fn<(keys: string | string[]) => Promise<void>>().mockResolvedValue(undefined),
}

Object.defineProperty(globalThis, 'chrome', {
  configurable: true,
  value: {
    storage: { local },
    downloads: { download: vi.fn().mockResolvedValue(1) },
    tabs: { create: vi.fn().mockResolvedValue({ id: 10 }), get: vi.fn().mockResolvedValue({ id: 10, status: 'complete' }), remove: vi.fn().mockResolvedValue(undefined), sendMessage: vi.fn().mockResolvedValue({ ok: false, message: 'Nicht bereit' }) },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue({ ok: true, downloadId: 1 }),
      onMessage: { addListener: vi.fn() },
      getManifest: vi.fn(() => ({ version: '0.2.0' })),
    },
  },
})

Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

beforeEach(() => {
  local.get.mockReset().mockResolvedValue({})
  local.set.mockReset().mockResolvedValue(undefined)
  local.remove.mockReset().mockResolvedValue(undefined)
  vi.mocked(chrome.downloads.download).mockReset().mockResolvedValue(1)
  vi.mocked(chrome.runtime.sendMessage).mockReset().mockResolvedValue({ ok: true, downloadId: 1 })
  vi.mocked(chrome.tabs.create).mockReset().mockResolvedValue({ id: 10 })
  vi.mocked(chrome.tabs.get).mockReset().mockResolvedValue({ id: 10, status: 'complete' })
  vi.mocked(chrome.tabs.remove).mockReset().mockResolvedValue(undefined)
  vi.mocked(chrome.tabs.sendMessage).mockReset().mockResolvedValue({ ok: false, message: 'Nicht bereit' })
})
