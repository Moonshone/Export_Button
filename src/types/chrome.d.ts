declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      id?: string
      tab?: tabs.Tab
    }

    interface MessageEvent {
      addListener(callback: (message: unknown, sender: MessageSender, sendResponse: (response: unknown) => void) => boolean | undefined): void
    }

    const onMessage: MessageEvent
    function sendMessage<M, R>(message: M): Promise<R>
    function getManifest(): { version: string }
  }
  namespace tabs {
    interface Tab { id?: number; status?: string; url?: string }
    interface CreateProperties { url: string; active?: boolean }
    function create(properties: CreateProperties): Promise<Tab>
    function remove(tabId: number): Promise<void>
    function sendMessage<M, R>(tabId: number, message: M): Promise<R>
  }
  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
      remove(keys: string | string[]): Promise<void>
    }

    const local: StorageArea
  }

  namespace downloads {
    interface DownloadOptions {
      url: string
      filename?: string
      saveAs?: boolean
    }

    function download(options: DownloadOptions): Promise<number>
  }
}
