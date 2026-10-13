import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { cx, toISODate, todayISO } from '../lib/format'

const WEEK_STARTS_ON = 1 // Monday

export interface CalendarRange {
  start: string
  end: string
  label: string
}

interface CalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  selected: string
  onSelect: (date: string) => void
  /** Dates that have an entry (shown with a dot). */
  marked: Set<string>
  /** What a dot means, for the legend and screen readers. */
  markedLabel?: string
  /** Date ranges (e.g. sprints) drawn as a bar under the days. */
  ranges?: CalendarRange[]
}

export function Calendar({ month, onMonthChange, selected, onSelect, marked, markedLabel = 'Stand-up', ranges = [] }: CalendarProps) {
  const today = todayISO()
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
  })

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="icon-btn" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <strong>{format(month, 'MMMM yyyy')}</strong>
        <button type="button" className="icon-btn" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className="calendar-weekday">
            {format(d, 'EEEEEE')}
          </div>
        ))}
        {days.map((d) => {
          const iso = toISODate(d)
          const range = ranges.find((r) => r.start <= iso && iso <= r.end)
          const hasEntry = marked.has(iso)
          return (
            <button
              key={iso}
              type="button"
              className={cx(
                'calendar-day',
                !isSameMonth(d, month) && 'outside',
                isWeekend(d) && 'weekend',
                iso === today && 'today',
                iso === selected && 'selected',
                hasEntry && 'marked',
                range && 'in-range',
                range?.start === iso && 'range-start',
                range?.end === iso && 'range-end',
              )}
              onClick={() => onSelect(iso)}
              aria-pressed={iso === selected}
              aria-label={`${format(d, 'EEEE, MMMM d, yyyy')}${hasEntry ? `, has ${markedLabel.toLowerCase()}` : ''}${range ? `, ${range.label}` : ''}`}
              title={range?.label}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i className="legend-dot" /> {markedLabel}
        </span>
        {ranges.length > 0 && (
          <span>
            <i className="legend-bar" /> Sprint
          </span>
        )}
      </div>
    </div>
  )
}
