import JSZip from 'jszip'
import { createConversationJson, createConversationMarkdown } from './currentChatExport'
import type { ChatGptProject, ExportedProjectChat, ProjectExportError, ProjectExportOptions } from './projectTypes'
import { formatLocalMinuteStamp } from '../services/exportFormatting'

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i
export function safePathComponent(value: string, fallback = 'ChatGPT-Projekt'): string {
  let result = Array.from(value, (character) => character.charCodeAt(0) <= 31 ? '-' : character).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/\.\.+/g, '-').replace(/^[. ]+|[. ]+$/g, '').replace(/\s+/g, ' ')
  if (!result || WINDOWS_RESERVED.test(result)) result = fallback
  return result.slice(0, 100).replace(/[. ]+$/g, '') || fallback
}
export function createProjectFilename(title: string, date: Date): string { return `chatgpt-project-${safePathComponent(title)}-${formatLocalMinuteStamp(date)}.zip` }
function folderNames(chats: ExportedProjectChat[]): string[] {
  const used = new Map<string, number>()
  return chats.map(({ reference }, index) => { const base = safePathComponent(reference.title, 'ChatGPT-Unterhaltung'); const count = (used.get(base) ?? 0) + 1; used.set(base, count); return `${String(index + 1).padStart(3, '0')}-${base}${count > 1 ? `-${count}` : ''}` })
}
export async function createProjectArchive(input: { project: ChatGptProject; chats: ExportedProjectChat[]; errors: ProjectExportError[]; options: ProjectExportOptions; extensionVersion: string }, exportedAt = new Date()) {
  const { project, chats, errors, options } = input; const zip = new JSZip(); const at = exportedAt.toISOString()
  const fileEntries = options.fileReferences ? project.files.map((file) => ({ name: file.name, source: file.source, relatedChatTitle: file.relatedChatTitle, url: file.url, downloadable: file.downloadable, includedInArchive: false, error: options.downloadableFiles ? 'Die Datei konnte nicht ohne internen Endpunkt sicher in das Archiv übernommen werden.' : 'Der Export tatsächlicher Dateien wurde nicht ausgewählt.' })) : []
  const warnings = [...errors.map((error) => error.message)]
  if (options.instructions && !project.instructions) warnings.push('Projektanweisungen waren im sichtbaren DOM nicht verfügbar.')
  if (fileEntries.some((file) => !file.includedInArchive)) warnings.push('Mindestens eine sichtbare Projektdatei ist nur als Verweis enthalten.')
  const complete = errors.length === 0 && chats.length === (options.chats ? project.chats.length : 0) && (!options.instructions || Boolean(project.instructions)) && (!options.downloadableFiles || fileEntries.every((file) => file.includedInArchive))
  const projectJson = { exportVersion: '1.0', source: 'chatgpt-visible-project', exportedAt: at, project: { id: project.id, title: project.title, url: project.url }, chatCountDiscovered: project.chats.length, chatCountExported: chats.length, chatCountFailed: project.chats.length - chats.length, fileReferenceCount: fileEntries.length, fileCountIncluded: 0, projectInstructionsIncluded: Boolean(options.instructions && project.instructions), complete }
  const names = folderNames(chats); const includedFiles = ['README.txt', 'manifest.json', 'project.json']
  chats.forEach((chat, index) => { const path = `chats/${names[index]}`; zip.file(`${path}/conversation.json`, createConversationJson(chat.conversation, new Date(chat.exportedAt))); zip.file(`${path}/conversation.md`, createConversationMarkdown(chat.conversation, new Date(chat.exportedAt))); includedFiles.push(`${path}/conversation.json`, `${path}/conversation.md`) })
  if (options.instructions && project.instructions) { zip.file('instructions/project-instructions.md', `# Projektanweisungen\n\n${project.instructions}\n`); includedFiles.push('instructions/project-instructions.md') }
  if (fileEntries.length) { zip.file('files/index.json', JSON.stringify(fileEntries, null, 2)); zip.file('files/README.txt', 'Dieses Verzeichnis dokumentiert sichtbare Dateiverweise. Nicht sicher herunterladbare Dateien sind nicht im Archiv enthalten.\n'); includedFiles.push('files/index.json', 'files/README.txt') }
  if (errors.length || warnings.length) { zip.file('errors.json', JSON.stringify({ errors: [...errors, ...warnings.filter((warning) => !errors.some((error) => error.message === warning)).map((message) => ({ type: 'project', message }))] }, null, 2)); includedFiles.push('errors.json') }
  const includedFolders = [...new Set(includedFiles.filter((name) => name.includes('/')).map((name) => name.split('/')[0]))]
  const manifest = { exportVersion: '1.0', applicationName: 'Lokaler ChatGPT-Export', extensionVersion: input.extensionVersion, exportedAt: at, exportType: 'chatgpt-project', projectTitle: project.title, projectUrl: project.url, totalChatCount: project.chats.length, exportedChatCount: chats.length, failedChatCount: project.chats.length - chats.length, fileReferenceCount: fileEntries.length, includedFileCount: 0, projectInstructionsIncluded: projectJson.projectInstructionsIncluded, includedFolders, includedFiles, warnings, complete }
  zip.file('project.json', JSON.stringify(projectJson, null, 2)); zip.file('manifest.json', JSON.stringify(manifest, null, 2)); zip.file('README.txt', ['Lokaler ChatGPT-Projektexport', '', `Projekt: ${project.title}`, `Exportiert am: ${at}`, '', 'Die ZIP-Datei wurde vollständig lokal im Browser erstellt. Es wurden keine Daten an einen externen Server übertragen.', 'Enthalten sind ausschließlich im Browser zugängliche Inhalte. Versteckte, nicht geladene oder nicht herunterladbare Inhalte können fehlen.', 'Diese Erweiterung ist kein offizielles OpenAI-Produkt.', complete ? 'Der Export gilt für die ausgewählten Inhalte als vollständig.' : 'Der Export ist teilweise oder seine Vollständigkeit kann nicht sicher nachgewiesen werden.', errors.length || warnings.length ? 'Hinweise und Fehler stehen in errors.json.' : 'Es wurden keine Fehler dokumentiert.'].join('\n'))
  return { filename: createProjectFilename(project.title, exportedAt), base64: await zip.generateAsync({ type: 'base64' }), complete }
}
