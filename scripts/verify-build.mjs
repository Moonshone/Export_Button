import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const distDirectory = resolve('dist')
const manifestPath = resolve(distDirectory, 'manifest.json')
const contentScriptPath = resolve(distDirectory, 'content-script.js')

await Promise.all([access(manifestPath), access(contentScriptPath)])

const [manifestSource, contentScript] = await Promise.all([
  readFile(manifestPath, 'utf8'),
  readFile(contentScriptPath, 'utf8'),
])
const manifest = JSON.parse(manifestSource)

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

console.log('Build geprüft: Content Script ist eigenständig und alle Manifest-Dateien sind vorhanden.')
