import { parseISO, subDays } from 'date-fns'
import { toISODate } from './format'
import { OPEN_PROJECT_STATUSES } from './status'
import type { Project, TicketTally } from './types'

const WINDOW_DAYS = 7

/** First day of the "last 7 days", which include today. */
export function ticketWindowStart(today: string) {
  return toISODate(subDays(parseISO(today), WINDOW_DAYS - 1))
}

export interface ClientTickets {
  /** Empty for projects without a client. */
  key: string
  client: string
  /** Names of the projects counted. */
  projects: string[]
  today: number
  week: number
}

/**
 * Totals per client, from counts that cover the last 7 days. Spelling differences in
 * case or spacing don't split a client. A finished project is left out unless it
 * completed tickets recently. Sorted by name, with "No client" last.
 */
export function summarizeClientTickets(projects: Project[], counts: TicketTally[], today: string): ClientTickets[] {
  const byProject = new Map<string, { today: number; week: number }>()
  for (const c of counts) {
    const totals = byProject.get(c.project_id) ?? { today: 0, week: 0 }
    totals.week += c.completed
    if (c.date === today) totals.today += c.completed
    byProject.set(c.project_id, totals)
  }

  const clients = new Map<string, ClientTickets>()
  for (const project of projects) {
    const totals = byProject.get(project.id)
    if (!totals?.week && !OPEN_PROJECT_STATUSES.has(project.status)) continue

    const name = project.client?.trim() ?? ''
    const key = name.toLowerCase()
    const client = clients.get(key) ?? { key, client: name || 'No client', projects: [], today: 0, week: 0 }
    client.projects.push(project.name)
    client.today += totals?.today ?? 0
    client.week += totals?.week ?? 0
    clients.set(key, client)
  }

  return [...clients.values()].sort((a, b) => Number(!a.key) - Number(!b.key) || a.client.localeCompare(b.client))
}
