import { GPT_SELECTORS } from './gptSelectors'
import { parseChatGptGptUrl, type ParsedGptUrl } from './gptUrl'
import type { CustomGptExportData, GptCapabilities, GptExportSource, GptVisibility } from './gptTypes'
const clean = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() || undefined
const excluded = (node: Element) => Boolean(node.closest('nav, aside, [role="navigation"], [role="dialog"], #chat-export-extension-root'))
const visible = (node: Element) => !excluded(node) && !node.closest('[hidden],[aria-hidden="true"]') && (!(node instanceof HTMLElement) || (node.style.display !== 'none' && node.style.visibility !== 'hidden'))
const text = (root: ParentNode, selector: string) => clean(Array.from(root.querySelectorAll(selector)).find(visible)?.textContent)
const state = (node: Element): boolean | null => node.getAttribute('aria-checked') === 'true' || node.getAttribute('data-enabled') === 'true' ? true : node.getAttribute('aria-checked') === 'false' || node.getAttribute('data-enabled') === 'false' ? false : null
export function redactSensitiveActionConfiguration(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveActionConfiguration)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, /^(api_?key|token|accessToken|refreshToken|authorization|secret|clientSecret|password|cookie|privateKey)$/i.test(key) ? '[NICHT EXPORTIERT]' : redactSensitiveActionConfiguration(item)]))
}
export function findVisibleGptRoot(documentRef: Document): ParentNode {
  const semantic = Array.from(documentRef.querySelectorAll(GPT_SELECTORS.root)).find(visible)
  if (semantic) return semantic
  const central = Array.from(documentRef.querySelectorAll('[data-testid="conversation-turns"], [data-testid="page-content"], [data-gpt-root]')).find(visible)
  return central ?? documentRef.body
}
function slugName(id?: string): string | undefined {
  if (!id) return undefined
  const value = id.replace(/^g-/i, '').replace(/^[0-9a-f]{32}-/i, '')
  if (!value || /^[0-9a-f]{32}$/i.test(value)) return undefined
  return value.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || undefined
}
export function readVisibleGptName(root: ParentNode, parsedUrl?: ParsedGptUrl): string {
  return text(root, GPT_SELECTORS.name) ?? slugName(parsedUrl?.id) ?? 'ChatGPT-GPT'
}
function creatorName(root: ParentNode): string | undefined {
  const explicit = text(root, GPT_SELECTORS.creator)
  const candidates = explicit ? [explicit] : Array.from(root.querySelectorAll('p, span, div')).filter(visible).map((node) => clean(node.textContent)).filter((value): value is string => Boolean(value))
  for (const value of candidates) { const match = value.match(/^(?:Von|By)\s+(.+)$/i); if (match) return clean(match[1]) }
  return explicit
}
function description(root: ParentNode): string | undefined {
  const explicit = text(root, GPT_SELECTORS.description)
  if (explicit) return explicit
  const heading = Array.from(root.querySelectorAll('h1, [role="heading"][aria-level="1"]')).find(visible)
  if (!heading) return undefined
  const candidates = Array.from(root.querySelectorAll('p')).filter((node) => visible(node) && Boolean(heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))
  return candidates.map((node) => clean(node.textContent)).find((value) => value && !/^(Von|By)\s+/i.test(value))
}
function starters(root: ParentNode): string[] {
  const nodes = [...Array.from(root.querySelectorAll(GPT_SELECTORS.starter)), ...Array.from(root.querySelectorAll('[data-starter-area] button, [data-starter-area] [role="button"]'))]
  const heading = Array.from(root.querySelectorAll('h1, [role="heading"][aria-level="1"]')).find(visible)
  const composer = Array.from(root.querySelectorAll('[contenteditable="true"], textarea[placeholder], textarea[data-placeholder]')).find(visible)
  if (heading && composer) {
    for (const node of root.querySelectorAll('button, [role="button"]')) {
      const afterHeading = Boolean(heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
      const beforeComposer = Boolean(node.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING)
      const label = `${node.getAttribute('aria-label') ?? ''} ${clean(node.textContent) ?? ''}`
      if (afterHeading && beforeComposer && !node.closest('header') && !/(menü|menu|mikrofon|microphone|voice|sprache|modell|model|schließen|close|hinzufügen|add|export)/i.test(label) && (clean(node.textContent)?.length ?? 0) >= 20) nodes.push(node)
    }
  }
  return [...new Set(nodes.filter(visible).map((node) => clean(node.textContent)).filter((value): value is string => Boolean(value)))]
}
export function readVisibleGpt(documentRef: Document, source: GptExportSource, id?: string): CustomGptExportData | undefined {
  const parsed = parseChatGptGptUrl(documentRef.location.href)
  const root = findVisibleGptRoot(documentRef)
  const name = readVisibleGptName(root, parsed)
  const unique = (selector: string) => [...new Set(Array.from(root.querySelectorAll(selector)).filter(visible).map((node) => clean(node.textContent)).filter((v): v is string => Boolean(v)))]
  const capabilities: GptCapabilities = { otherVisibleCapabilities: [] }
  for (const node of root.querySelectorAll(GPT_SELECTORS.capability)) { const label = clean(node.getAttribute('data-capability') ?? node.textContent)?.toLowerCase(); if (!label) continue; const value = state(node); if (/web|browse/.test(label)) capabilities.webSearch = value; else if (/image|bild/.test(label)) capabilities.imageGeneration = value; else if (/code/.test(label)) capabilities.codeInterpreter = value; else if (/canvas/.test(label)) capabilities.canvas = value; else if (/data|analyse/.test(label)) capabilities.dataAnalysis = value; else capabilities.otherVisibleCapabilities.push(label) }
  const warning = source === 'gpt-detail' ? [{ section: 'general' as const, message: 'Dieser Export enthält nur öffentlich sichtbare GPT-Informationen. Interne Anweisungen, Wissensdateien und private Konfigurationen waren nicht zugänglich.' }] : []
  const visibilityLabel = text(root, GPT_SELECTORS.visibility); const visibility: GptVisibility = visibilityLabel && /public|öffentlich/i.test(visibilityLabel) ? 'public' : visibilityLabel && /workspace/i.test(visibilityLabel) ? 'workspace' : visibilityLabel && /link|geteilt/i.test(visibilityLabel) ? 'shared-link' : visibilityLabel && /privat/i.test(visibilityLabel) ? 'private' : 'unknown'
  const actions = source === 'gpt-editor' ? Array.from(root.querySelectorAll(GPT_SELECTORS.action)).filter(visible).map((node) => { const schemaText = clean(node.querySelector('pre,code,textarea')?.textContent); let schema: unknown; try { schema = schemaText ? redactSensitiveActionConfiguration(JSON.parse(schemaText)) : undefined } catch { schema = undefined } return { name: clean(node.getAttribute('data-name') ?? node.querySelector('h3,h4')?.textContent), domain: clean(node.getAttribute('data-domain')), authenticationType: clean(node.getAttribute('data-authentication')), openApiSchemaVisible: schema !== undefined, openApiSchema: schema, sensitiveValuesExcluded: true as const } }) : []
  return { exportSource: source, id: id ?? parsed?.id, name, description: description(root), url: documentRef.location.href, creator: { name: creatorName(root) }, visibility: { value: visibility, label: visibilityLabel }, instructions: source === 'gpt-editor' ? ((root.querySelector(GPT_SELECTORS.instructions) as HTMLTextAreaElement | null)?.value || text(root, GPT_SELECTORS.instructions)) : undefined, conversationStarters: starters(root).length ? starters(root) : unique(GPT_SELECTORS.starter), knowledgeFiles: source === 'gpt-editor' ? Array.from(root.querySelectorAll(GPT_SELECTORS.knowledge)).filter(visible).map((node) => ({ name: clean(node.getAttribute('data-name') ?? node.textContent) ?? 'Unbenannte Datei', type: clean(node.getAttribute('data-type')), sizeLabel: clean(node.getAttribute('data-size')), visibleUrl: (node.querySelector('a[href]') as HTMLAnchorElement | null)?.href, downloadable: Boolean(node.querySelector('a[download]')), includedInArchive: false, error: 'Nur der sichtbare Dateiverweis wurde exportiert.' })) : [], capabilities, actions, app: undefined, recommendedModel: text(root, GPT_SELECTORS.model), profileImage: (() => { const image = root.querySelector(GPT_SELECTORS.profileImage) as HTMLImageElement | null; return image ? { visibleUrl: image.src, alt: image.alt, includedInArchive: false } : undefined })(), warnings: warning, capturedAt: new Date().toISOString() }
}
