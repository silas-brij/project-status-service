import { isISODate } from './format'

const HEADING = /^(#{1,6})\s+(.*)$/

/** Returns the body of the first Markdown section whose heading matches `title`. */
export function extractSection(markdown: string, title: RegExp): string | null {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((line) => {
    const m = line.match(HEADING)
    return !!m && title.test(m[2].trim())
  })
  if (start === -1) return null

  const level = lines[start].match(HEADING)![1].length
  const body: string[] = []
  for (const line of lines.slice(start + 1)) {
    const m = line.match(HEADING)
    if (m && m[1].length <= level) break
    body.push(line)
  }
  return body.join('\n').trim() || null
}

/**
 * Default stand-up template. When the previous stand-up has a "Today" section,
 * it is carried over as this stand-up's "Yesterday".
 */
export function standupTemplate(previous?: string | null) {
  const carried = previous ? extractSection(previous, /^today\b/i) : null
  return `## Yesterday\n${carried ?? '- '}\n\n## Today\n- \n\n## Blockers\n- None\n`
}

/** Finds a date like 2026-10-13, 2026_10_13 or 20261013 in a file name. */
export function dateFromFilename(name: string): string | null {
  const m = name.match(/(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/)
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  return isISODate(iso) ? iso : null
}
