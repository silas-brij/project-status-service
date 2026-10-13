import { differenceInCalendarDays, parseISO } from 'date-fns'
import { plural, todayISO } from './format'
import type { Sprint } from './types'

export interface SprintProgress {
  phase: 'upcoming' | 'running' | 'ended'
  totalDays: number
  /** Days elapsed, counting today. */
  elapsed: number
  daysLeft: number
  startsIn: number
  pct: number
}

export function sprintProgress(s: Pick<Sprint, 'start_date' | 'end_date'>, today = todayISO()): SprintProgress {
  const start = parseISO(s.start_date)
  const totalDays = differenceInCalendarDays(parseISO(s.end_date), start) + 1
  if (today < s.start_date) {
    const startsIn = differenceInCalendarDays(start, parseISO(today))
    return { phase: 'upcoming', totalDays, elapsed: 0, daysLeft: totalDays, startsIn, pct: 0 }
  }
  if (today > s.end_date) {
    return { phase: 'ended', totalDays, elapsed: totalDays, daysLeft: 0, startsIn: 0, pct: 100 }
  }
  const elapsed = differenceInCalendarDays(parseISO(today), start) + 1
  return {
    phase: 'running',
    totalDays,
    elapsed,
    daysLeft: totalDays - elapsed,
    startsIn: 0,
    pct: Math.round((elapsed / totalDays) * 100),
  }
}

export function progressLabel(p: SprintProgress) {
  if (p.phase === 'upcoming') return p.startsIn === 1 ? 'Starts tomorrow' : `Starts in ${p.startsIn} days`
  if (p.phase === 'ended') return 'Ended'
  return `Day ${p.elapsed} of ${p.totalDays} · ${plural(p.daysLeft, 'day')} left`
}

export function sprintForDate<T extends Pick<Sprint, 'start_date' | 'end_date'>>(sprints: T[], date: string) {
  return sprints.find((s) => s.start_date <= date && date <= s.end_date) ?? null
}

/** The sprint to show as "current": an active sprint covering today, else any sprint covering today. */
export function currentSprint(sprints: Sprint[], today = todayISO()) {
  const covering = sprints.filter((s) => s.start_date <= today && today <= s.end_date)
  return covering.find((s) => s.status === 'active') ?? covering[0] ?? null
}
