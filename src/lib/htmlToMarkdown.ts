// Loaded on demand (see notesFile.ts), so the converter isn't part of the main bundle.
import TurndownService from 'turndown'
import { gfm } from '@joplin/turndown-plugin-gfm'

/** Elements whose content never belongs in the notes. */
const DROP = 'head, script, style, noscript, template, iframe, object, embed, svg, canvas'

const service = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  hr: '---',
})
service.use(gfm)
// Images that only exist next to the original file (or are embedded in it) can't be shown; keep their description.
service.addRule('localImage', {
  filter: (node) => node.nodeName === 'IMG' && !/^https?:\/\//i.test(node.getAttribute('src') ?? ''),
  replacement: (_content, node) => {
    const alt = (node as HTMLElement).getAttribute('alt')?.trim()
    return alt ? `*${alt}*` : ''
  },
})

/** Converts an HTML document or fragment to Markdown. */
export function htmlToMarkdown(html: string) {
  // DOMParser builds an inert document: nothing in it runs or loads.
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(DROP).forEach((el) => el.remove())

  // Markdown tables need a header row; use the first row when the table has none.
  for (const table of doc.querySelectorAll('table')) {
    if (table.querySelector('th')) continue
    table
      .querySelector('tr')
      ?.querySelectorAll('td')
      .forEach((td) => {
        const th = doc.createElement('th')
        th.innerHTML = td.innerHTML
        td.replaceWith(th)
      })
  }

  return tidy(service.turndown(doc.body))
}

/** "-   [x]  item" → "- [x] item" (outside code blocks), and at most one blank line in a row. */
function tidy(markdown: string) {
  let inFence = false
  const lines = markdown.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) return line
    return line.replace(/^(\s*)([-*+]|\d+\.)\s{2,}/, '$1$2 ').replace(/^(\s*[-*+] \[[ x]\])\s{2,}/, '$1 ')
  })
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
