import { useState } from 'react'
import { isSameMonth, parseISO, startOfMonth } from 'date-fns'

/**
 * The month a calendar shows. It can be paged freely, and follows the
 * selected date when that moves into another month (e.g. "Today", prev/next, links).
 */
export function useCalendarMonth(selected: string) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selected)))
  const [lastSelected, setLastSelected] = useState(selected)
  if (lastSelected !== selected) {
    setLastSelected(selected)
    if (!isSameMonth(parseISO(selected), month)) setMonth(startOfMonth(parseISO(selected)))
  }
  return [month, setMonth] as const
}
