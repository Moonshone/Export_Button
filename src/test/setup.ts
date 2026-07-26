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
  },
})

Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

beforeEach(() => {
  local.get.mockReset().mockResolvedValue({})
  local.set.mockReset().mockResolvedValue(undefined)
  local.remove.mockReset().mockResolvedValue(undefined)
  vi.mocked(chrome.downloads.download).mockReset().mockResolvedValue(1)
})
