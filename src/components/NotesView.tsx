import type { NotesFormat } from '../lib/types'
import { HtmlView } from './HtmlView'
import { Markdown } from './Markdown'

/** Stand-up or meeting notes: rendered Markdown, or an HTML document shown as designed. */
export function NotesView({ content, format }: { content: string; format: NotesFormat }) {
  return format === 'html' ? <HtmlView html={content} /> : <Markdown>{content}</Markdown>
}
