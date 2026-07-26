declare namespace chrome {
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
