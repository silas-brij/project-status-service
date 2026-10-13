import { downloadText, formatDate, formatRelativeDay, slugify } from './format'
import type { Meeting, MeetingSummary } from './types'

/** Quick picks for the title field. */
export const MEETING_SUGGESTIONS = [
  'Kickoff',
  'Sprint planning',
  'Sprint review',
  'Retrospective',
  'Client demo',
  'Client sync',
  'Design review',
  'Workshop',
]

export const MEETING_TEMPLATE = '## Agenda\n- \n\n## Notes\n- \n\n## Action items\n- [ ] \n'

/** `14:00:00` → `14:00` */
export const formatTime = (time: string) => time.slice(0, 5)

/** "14:00–15:00", "14:00", or null when no time is set. */
export function meetingTime(m: Pick<MeetingSummary, 'start_time' | 'end_time'>) {
  if (!m.start_time) return null
  return m.end_time ? `${formatTime(m.start_time)}–${formatTime(m.end_time)}` : formatTime(m.start_time)
}

/** "Today · 14:00", "Tomorrow", "Thu, Oct 15 · 14:00" */
export function meetingWhen(m: Pick<MeetingSummary, 'date' | 'start_time'>, today: string) {
  const relative = formatRelativeDay(m.date, today)
  const day =
    relative === 'today' || relative === 'tomorrow'
      ? relative[0].toUpperCase() + relative.slice(1)
      : formatDate(m.date, 'EEE, MMM d')
  return m.start_time ? `${day} · ${formatTime(m.start_time)}` : day
}

/** Splits "Ana, Ben; Chris" (commas, semicolons or new lines) into unique names. */
export function parseAttendees(text: string) {
  const seen = new Set<string>()
  return text
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter((name) => {
      const key = name.toLowerCase()
      if (!name || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const isLink = (text: string) => /^https?:\/\/\S+$/i.test(text.trim())

/** A link's host, e.g. "meet.google.com", instead of the whole URL. */
export function linkLabel(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** The meeting as a standalone Markdown document. */
export function meetingMarkdown(m: Meeting, projectName: string) {
  const time = meetingTime(m)
  const details = [
    `- **Project:** ${projectName}`,
    `- **Date:** ${formatDate(m.date, 'EEEE, MMMM d, yyyy')}`,
    time && `- **Time:** ${time}`,
    m.location && `- **Location:** ${m.location}`,
    m.attendees.length > 0 && `- **Attendees:** ${m.attendees.join(', ')}`,
  ].filter(Boolean)
  return `# ${m.title}\n\n${details.join('\n')}\n\n---\n\n${m.notes.trim()}\n`
}

export const meetingFilename = (m: Meeting, projectName: string, ext = 'md') =>
  `${slugify(projectName)}-${m.date}-${slugify(m.title)}.${ext}`

export const meetingDownloadExt = (m: Meeting) => (m.notes_format === 'html' ? 'html' : 'md')

/** Markdown notes download as a .md document with the meeting details; HTML notes as the HTML file itself. */
export function downloadMeeting(m: Meeting, projectName: string) {
  if (m.notes_format === 'html') downloadText(meetingFilename(m, projectName, 'html'), m.notes, 'html')
  else downloadText(meetingFilename(m, projectName), meetingMarkdown(m, projectName))
}
