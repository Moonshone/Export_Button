import JSZip from 'jszip'
import type { CustomGptExportData, GptExportOptions } from './gptTypes'
const json = (value: unknown) => JSON.stringify(value, null, 2)
export async function createGptArchive(gpt: CustomGptExportData, options: GptExportOptions, extensionVersion = 'unknown'): Promise<{ filename: string; base64: string; complete: boolean; warningCount: number }> {
  const zip = new JSZip(); const files: string[] = []; const add = (path: string, value: string) => { zip.file(path, value); files.push(path) }
  const warnings = [...gpt.warnings]
  if (options.instructions && !gpt.instructions && gpt.exportSource === 'gpt-editor') warnings.push({ section: 'instructions', message: 'Keine sichtbaren GPT-Anweisungen waren zugänglich.' })
  if (options.knowledgeDownloads) for (const file of gpt.knowledgeFiles.filter((item) => !item.includedInArchive)) warnings.push({ section: 'knowledge', message: `${file.name}: Die Datei konnte nicht über eine sichere sichtbare Downloadmöglichkeit aufgenommen werden.` })
  const instructionsIncluded = Boolean(options.instructions && gpt.instructions)
  const starters = options.conversationStarters ? gpt.conversationStarters.map((text, index) => ({ position: index + 1, text })) : []
  const completeForVisibleConfiguration = warnings.every((warning) => warning.section === 'general' && gpt.exportSource === 'gpt-detail')
  const complete = gpt.exportSource === 'gpt-editor' && completeForVisibleConfiguration
  if (instructionsIncluded) add('instructions/gpt-instructions.md', `${gpt.instructions}\n`)
  if (starters.length) { add('conversation-starters/conversation-starters.json', json({ conversationStarters: starters })); add('conversation-starters/conversation-starters.md', `${starters.map((s) => `${s.position}. ${s.text}`).join('\n')}\n`) }
  if (options.knowledgeReferences && gpt.knowledgeFiles.length) { add('knowledge/index.json', json(gpt.knowledgeFiles)); add('knowledge/README.txt', 'Wissensdateien sind nur enthalten, wenn includedInArchive true ist. Andernfalls enthält dieser Ordner ausschließlich sichtbare Verweise.\n') }
  if (options.capabilities && Object.keys(gpt.capabilities).length > 1) add('capabilities/capabilities.json', json(gpt.capabilities))
  if (options.integrations && gpt.app) add('apps/app.json', json(gpt.app))
  if (options.integrations && gpt.actions.length) { add('actions/index.json', json(gpt.actions.map((action) => ({ ...action, openApiSchema: undefined })))); if (options.openApiSchemas) gpt.actions.forEach((action, index) => { if (action.openApiSchemaVisible && action.openApiSchema !== undefined) add(`actions/action-${String(index + 1).padStart(3, '0')}/openapi-schema.json`, json(action.openApiSchema)) }) }
  if (options.profileImageReference && gpt.profileImage) add('appearance/profile-image-reference.json', json(gpt.profileImage))
  const summary = { exportVersion: '1.0', exportType: 'chatgpt-custom-gpt', exportSource: gpt.exportSource, exportedAt: gpt.capturedAt, gpt: { id: gpt.id, name: gpt.name, description: gpt.description, url: gpt.url, creator: gpt.creator, visibility: gpt.visibility, recommendedModel: gpt.recommendedModel }, instructionsIncluded, conversationStarterCount: starters.length, knowledgeFileReferenceCount: options.knowledgeReferences ? gpt.knowledgeFiles.length : 0, knowledgeFileIncludedCount: gpt.knowledgeFiles.filter((file) => file.includedInArchive).length, capabilitiesIncluded: options.capabilities, appIncluded: Boolean(options.integrations && gpt.app), actionCount: options.integrations ? gpt.actions.length : 0, openApiSchemaCount: gpt.actions.filter((action) => options.openApiSchemas && action.openApiSchemaVisible).length, profileImageIncluded: false, sensitiveValuesExcluded: true, complete, completeForVisibleConfiguration }
  add('gpt.json', json(summary)); if (warnings.length) add('warnings.json', json(warnings))
  const includedFolders = [...new Set(files.filter((path) => path.includes('/')).map((path) => path.split('/')[0]))]
  add('README.txt', `ChatGPT-GPT-Export\nErstellt: ${gpt.capturedAt}\nGPT: ${gpt.name}\nQuelle: ${gpt.exportSource === 'gpt-editor' ? 'GPT-Editor' : 'öffentliche/geteilte GPT-Seite'}\nStatus: ${complete ? 'vollständig' : 'teilweise'}\n\nDieser Export wurde lokal im Browser erstellt. Es wurden keine Daten an einen externen Server gesendet. Erfasst wurden nur über die Oberfläche zugängliche Informationen. Geheime Zugangsdaten wurden nicht exportiert. Nicht herunterladbare Wissensdateien können nur als Verweis enthalten sein. warnings.json dokumentiert ausgelassene Inhalte. Diese Erweiterung ist kein offizielles OpenAI-Produkt.\n`)
  add('manifest.json', json({ ...summary, applicationName: 'Export Button', extensionVersion, gptId: gpt.id, gptName: gpt.name, gptUrl: gpt.url, includedFolders, includedFiles: files, warnings }))
  const stamp = new Date(gpt.capturedAt).toISOString().slice(0, 16).replace('T', '-').replace(':', '-')
  const safeName = [...gpt.name].map((character) => character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character).join('').replace(/\.{2,}/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 80) || 'ChatGPT-GPT'
  return { filename: `chatgpt-gpt-${safeName}-${stamp}.zip`, base64: await zip.generateAsync({ type: 'base64' }), complete, warningCount: warnings.length }
}
