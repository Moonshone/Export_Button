import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const distDirectory = resolve('dist')
const manifestPath = resolve(distDirectory, 'manifest.json')
const contentScriptPath = resolve(distDirectory, 'content-script.js')
const popupPath = resolve(distDirectory, 'popup.html')
const backgroundPath = resolve(distDirectory, 'background.js')

await Promise.all([access(manifestPath), access(contentScriptPath), access(backgroundPath), access(popupPath), access(resolve(distDirectory, 'content-style.css'))])

const [manifestSource, contentScript] = await Promise.all([
  readFile(manifestPath, 'utf8'),
  readFile(contentScriptPath, 'utf8'),
])
const manifest = JSON.parse(manifestSource)
if ((manifest.host_permissions ?? []).some((permission) => permission === '<all_urls>')) throw new Error('<all_urls> ist nicht erlaubt.')

if (typeof manifest.background?.service_worker !== 'string') {
  throw new Error('manifest.background.service_worker fehlt.')
}

const forbiddenPatterns = [
  { label: 'statischer Import', pattern: /(^|[;{}]\s*)import\s+[^('"`][\s\S]*?\sfrom\s*['"]/m },
  { label: 'dynamischer Import', pattern: /\bimport\s*\(/ },
  { label: 'benannter Export', pattern: /(^|[;{}]\s*)export\s*\{/m },
]

for (const { label, pattern } of forbiddenPatterns) {
  if (pattern.test(contentScript)) {
    throw new Error(`dist/content-script.js enthält einen verbotenen ${label}.`)
  }
}

if (/\b(?:import|require)\s*(?:\(|[^;]*?from\s*)['"]\.\/?assets\/[^'"]+\.js/.test(contentScript)) {
  throw new Error('dist/content-script.js lädt einen JavaScript-Chunk aus assets/.')
}

const referencedFiles = new Set([
  manifest.action?.default_popup,
  manifest.background.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((entry) => [...(entry.js ?? []), ...(entry.css ?? [])]),
].filter(Boolean))

await Promise.all(
  [...referencedFiles].map(async (file) => {
    try {
      await access(resolve(distDirectory, file))
    } catch {
      throw new Error(`Die in manifest.json referenzierte Datei fehlt: ${file}`)
    }
  }),
)

const entries = await readdir(distDirectory, { recursive: true })
if (entries.some((entry) => /(?:\.test\.|\.spec\.|__tests__|\.(?:zip|png|jpe?g|gif|webp)$)/i.test(entry))) throw new Error('dist enthält Test- oder unerwartete Binärdateien.')
for (const file of entries.filter((entry) => /\.(?:html|js|css)$/.test(entry))) { const source = await readFile(resolve(distDirectory, file), 'utf8'); if (/(?:<script[^>]+src|<link[^>]+href|import\s*(?:\(|[^;]+from))[^>;'\"]*['\"]https?:\/\//i.test(source)) throw new Error(`Remote-Ressource in ${file} gefunden.`) }

console.log('Build geprüft: Content Script ist eigenständig und alle Manifest-Dateien sind vorhanden.')
