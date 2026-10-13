import { sanitizeHtml } from './sanitizeHtml'
import type { NotesFormat } from './types'

/** What the "load notes from a file" pickers accept. */
export const NOTES_FILE_ACCEPT = '.md,.markdown,.txt,.html,.htm,text/markdown,text/plain,text/html'

export const isHtmlFile = (file: File) => /\.html?$/i.test(file.name) || file.type === 'text/html'

export interface Notes {
  content: string
  format: NotesFormat
}

/** Reads a notes file. HTML stays HTML (cleaned, so it is safe to show); everything else is Markdown. */
export async function readNotesFile(file: File): Promise<Notes> {
  if (!isHtmlFile(file)) return { content: await file.text(), format: 'markdown' }
  return { content: sanitizeHtml(await readHtml(file)), format: 'html' }
}

/** Notes as Markdown: HTML is converted (for exports, the stand-up template, "Convert to Markdown"). */
export async function toMarkdown(content: string, format: NotesFormat) {
  if (format !== 'html') return content
  const { htmlToMarkdown } = await import('./htmlToMarkdown')
  return htmlToMarkdown(content)
}

/** True when notes show nothing: no text, images or tables. */
export function isBlankNotes(content: string, format: NotesFormat) {
  if (format !== 'html') return !content.trim()
  const body = new DOMParser().parseFromString(content, 'text/html').body
  return !body.textContent?.trim() && !body.querySelector('img, table, hr, svg')
}

/** Decodes an HTML file, honouring a `<meta charset>` such as windows-1252 (Word's "Save as web page"). */
async function readHtml(file: File) {
  const bytes = await file.arrayBuffer()
  const utf8 = new TextDecoder().decode(bytes)
  const charset = utf8.slice(0, 4096).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
  if (!charset || /^utf-?8$/i.test(charset)) return utf8
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return utf8 // Unknown charset: UTF-8 is the best guess.
  }
}
