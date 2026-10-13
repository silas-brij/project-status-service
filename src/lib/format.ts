import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')

export const todayISO = () => toISODate(new Date())

export function isISODate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))
}

export function formatDate(iso: string | null | undefined, pattern = 'MMM d, yyyy') {
  return iso ? format(parseISO(iso), pattern) : '—'
}

export function formatRange(start: string, end: string) {
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${formatDate(start, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${formatDate(end)}`
}

/** "today", "tomorrow", "in 5 days", "3 days ago" … */
export function formatRelativeDay(iso: string, today = todayISO()) {
  const diff = differenceInCalendarDays(parseISO(iso), parseISO(today))
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`
}

export function formatMoney(amount: number | null | undefined, currency: string) {
  const value = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  )
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
