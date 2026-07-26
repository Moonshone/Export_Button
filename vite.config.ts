import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        'content-script': resolve(__dirname, 'src/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) =>
          assetInfo.names?.includes('content-style.css')
            ? 'content-style.css'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
