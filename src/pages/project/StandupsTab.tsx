import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router'
import { endOfMonth, format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { Calendar } from '../../components/Calendar'
import { ErrorBox } from '../../components/Feedback'
import { Markdown } from '../../components/Markdown'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { Loading, MarkdownSkeleton, Skeleton } from '../../components/Skeleton'
import * as api from '../../lib/api'
import { cx, downloadText, errorMessage, formatDate, isISODate, plural, slugify, toISODate, todayISO } from '../../lib/format'
import { sprintForDate } from '../../lib/sprints'
import { dateFromFilename, standupTemplate } from '../../lib/standup'
import type { Project, Sprint } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { StandupDateListSkeleton, StandupEntriesSkeleton } from '../skeletons'
import { useProject } from './ProjectLayout'

type View = 'day' | 'month'

const MD_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain'

export function StandupsTab() {
  const { project } = useProject()
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date')
  const selected = isISODate(dateParam) ? dateParam : todayISO()
  const view: View = params.get('view') === 'month' ? 'month' : 'day'

  const [month, setMonth] = useState(() => startOfMonth(parseISO(selected)))
  // Follow the selected date into another month (e.g. "Today", prev/next, links).
  const [lastSelected, setLastSelected] = useState(selected)
  if (lastSelected !== selected) {
    setLastSelected(selected)
    if (!isSameMonth(parseISO(selected), month)) setMonth(startOfMonth(parseISO(selected)))
  }

  const dates = useAsync(() => api.listStandupDates(project.id), [project.id])
  const sprints = useAsync(() => api.listSprints(project.id), [project.id])
  const dateSet = useMemo(() => new Set((dates.data ?? []).map((d) => d.date)), [dates.data])
  const ranges = useMemo(
    () => (sprints.data ?? []).map((s) => ({ start: s.start_date, end: s.end_date, label: s.name })),
    [sprints.data],
  )

  const dirty = useRef(false)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  const allDates = dates.data ?? []
  const prevDate = allDates.findLast((d) => d.date < selected)?.date
  const nextDate = allDates.find((d) => d.date > selected)?.date
  const monthDates = allDates.filter((d) => isSameMonth(parseISO(d.date), month))

  function confirmDiscard() {
    if (dirty.current && !window.confirm('You have unsaved stand-up changes. Discard them?')) return false
    dirty.current = false
    return true
  }

  function go(next: { date?: string; view?: View }) {
    if (!confirmDiscard()) return
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (next.date) p.set('date', next.date)
      if (next.view) p.set('view', next.view)
      return p
    })
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || !confirmDiscard()) return

    const byDate = new Map<string, string>()
    const skipped: string[] = []
    for (const file of files) {
      // A single file without a date in its name goes to the selected day.
      const date = dateFromFilename(file.name) ?? (files.length === 1 ? selected : null)
      if (date) byDate.set(date, await file.text())
      else skipped.push(file.name)
    }
    if (byDate.size === 0) {
      setNotice({ tone: 'error', text: `No date found in the file names. Name files like 2026-10-13.md.` })
      return
    }
    const replacing = [...byDate.keys()].filter((d) => dateSet.has(d)).length
    if (replacing && !window.confirm(`${plural(replacing, 'day')} already ${replacing === 1 ? 'has' : 'have'} a stand-up. Replace with the imported file?`)) {
      return
    }
    try {
      await api.saveStandups(
        project.id,
        [...byDate].map(([date, content]) => ({ date, content })),
      )
      dates.reload()
      setVersion((v) => v + 1)
      const imported = [...byDate.keys()].sort()
      setNotice({
        tone: 'success',
        text: `Imported ${plural(imported.length, 'stand-up')}.${skipped.length ? ` Skipped (no date in name): ${skipped.join(', ')}.` : ''}`,
      })
      if (imported.length === 1) go({ date: imported[0], view: 'day' })
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) })
    }
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="View">
          <button type="button" className={cx(view === 'day' && 'active')} onClick={() => go({ view: 'day' })}>
            Day
          </button>
          <button type="button" className={cx(view === 'month' && 'active')} onClick={() => go({ view: 'month' })}>
            Month
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setMonth(startOfMonth(new Date()))
            go({ date: todayISO() })
          }}
        >
          Today
        </button>
        <div className="spacer" />
        <button type="button" className="btn btn-sm" onClick={() => importInput.current?.click()} title="Files named like 2026-10-13.md are placed on that date">
          Import .md files
        </button>
        <input ref={importInput} type="file" accept={MD_ACCEPT} multiple hidden onChange={onImport} />
      </div>

      {notice && (
        <div className={`alert alert-${notice.tone}`}>
          <span className="grow">{notice.text}</span>
          <button type="button" className="icon-btn" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {dates.error && <ErrorBox>{dates.error}</ErrorBox>}

      <div className="standups-layout">
        <aside className="stack">
          <div className="card">
            <Calendar
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={(date) => go({ date, view: 'day' })}
              marked={dateSet}
              ranges={ranges}
            />
          </div>
          <div className="card">
            <h3 className="card-title">
              {format(month, 'MMMM')} · {dates.data ? plural(monthDates.length, 'stand-up') : <Skeleton w={80} />}
            </h3>
            {!dates.data ? (
              !dates.error && <StandupDateListSkeleton />
            ) : monthDates.length === 0 ? (
              <p className="muted small">Nothing this month.</p>
            ) : (
              <ul className="date-list">
                {monthDates.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={cx('date-list-item', d.date === selected && view === 'day' && 'active')}
                      onClick={() => go({ date: d.date, view: 'day' })}
                    >
                      <span>{formatDate(d.date, 'EEE, MMM d')}</span>
                      <span className="muted small truncate">{sprintForDate(sprints.data ?? [], d.date)?.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {view === 'day' ? (
            <StandupDay
              key={`${selected}:${version}`}
              project={project}
              date={selected}
              sprint={sprintForDate(sprints.data ?? [], selected)}
              prevDate={prevDate}
              nextDate={nextDate}
              onNavigate={(date) => go({ date })}
              onChanged={dates.reload}
              dirty={dirty}
            />
          ) : (
            <StandupMonth key={version} project={project} month={month} onOpen={(date) => go({ date, view: 'day' })} />
          )}
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface StandupDayProps {
  project: Project
  date: string
  sprint: Sprint | null
  prevDate?: string
  nextDate?: string
  onNavigate: (date: string) => void
  onChanged: () => void
  dirty: { current: boolean }
}

function StandupDay({ project, date, sprint, prevDate, nextDate, onNavigate, onChanged, dirty }: StandupDayProps) {
  const entry = useAsync(() => api.getStandup(project.id, date), [project.id, date])
  /** `null` = not editing. */
  const [draft, setDraft] = useState<string | null>(null)
  const [baseline, setBaseline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  dirty.current = draft !== null && draft !== baseline

  function edit(text: string, base = text) {
    setDraft(text)
    setBaseline(base)
    setError(null)
  }

  async function startEditing() {
    if (entry.data) return edit(entry.data.content)
    let previous: string | null = null
    if (prevDate) {
      try {
        previous = (await api.getStandup(project.id, prevDate))?.content ?? null
      } catch {
        // Fall back to the plain template.
      }
    }
    edit(standupTemplate(previous))
  }

  function cancel() {
    if (dirty.current && !window.confirm('Discard your changes?')) return
    setDraft(null)
    setError(null)
  }

  async function save() {
    if (draft === null || busy) return
    if (!draft.trim()) return setError('The stand-up is empty.')
    setBusy(true)
    setError(null)
    try {
      entry.mutate(await api.saveStandup(project.id, date, draft))
      setDraft(null)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!entry.data || !window.confirm(`Delete the stand-up for ${formatDate(date)}?`)) return
    try {
      await api.deleteStandup(entry.data.id)
      entry.mutate(null)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function loadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) edit(await file.text(), '')
  }

  const isToday = date === todayISO()

  return (
    <article className="card standup-day">
      <header className="standup-day-header">
        <div className="min-w-0">
          <div className="eyebrow">
            {format(parseISO(date), 'EEEE')}
            {isToday && ' · Today'}
          </div>
          <h2>{formatDate(date, 'MMMM d, yyyy')}</h2>
          {sprint && <span className="chip">{sprint.name}</span>}
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-sm" disabled={!prevDate} onClick={() => prevDate && onNavigate(prevDate)} title="Previous stand-up">
            ‹ Prev
          </button>
          <button type="button" className="btn btn-sm" disabled={!nextDate} onClick={() => nextDate && onNavigate(nextDate)} title="Next stand-up">
            Next ›
          </button>
        </div>
      </header>

      {error && <ErrorBox>{error}</ErrorBox>}

      {entry.loading ? (
        <Loading>
          <MarkdownSkeleton />
        </Loading>
      ) : entry.error ? (
        <ErrorBox>{entry.error}</ErrorBox>
      ) : draft !== null ? (
        <div className="stack">
          <MarkdownEditor value={draft} onChange={setDraft} rows={16} autoFocus onSubmitShortcut={save} />
          <div className="form-actions">
            <span className="muted small hide-sm">Ctrl + Enter to save</span>
            <div className="spacer" />
            <button type="button" className="btn" onClick={cancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save stand-up'}
            </button>
          </div>
        </div>
      ) : entry.data ? (
        <>
          <Markdown>{entry.data.content}</Markdown>
          <footer className="standup-day-footer">
            <span className="muted small">Last edited {format(parseISO(entry.data.updated_at), 'MMM d, HH:mm')}</span>
            <div className="spacer" />
            <button type="button" className="btn btn-sm btn-danger-ghost" onClick={remove}>
              Delete
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => downloadText(`${slugify(project.name)}-${date}.md`, entry.data!.content)}
            >
              Download .md
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={startEditing}>
              Edit
            </button>
          </footer>
        </>
      ) : (
        <div className="empty-day">
          <p className="muted">No stand-up for this day yet.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={startEditing}>
              Write stand-up
            </button>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
              Load from .md file
            </button>
          </div>
          {prevDate && <p className="muted small">"Today" from your previous stand-up is carried over into "Yesterday".</p>}
          <input ref={fileInput} type="file" accept={MD_ACCEPT} hidden onChange={loadFile} />
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------

function StandupMonth({ project, month, onOpen }: { project: Project; month: Date; onOpen: (date: string) => void }) {
  const from = toISODate(startOfMonth(month))
  const to = toISODate(endOfMonth(month))
  const list = useAsync(() => api.listStandupsInRange(project.id, from, to), [project.id, from, to])
  const entries = list.data ?? []

  function downloadMonth() {
    const title = `# ${project.name} — Stand-ups, ${format(month, 'MMMM yyyy')}`
    const body = entries.map((s) => `## ${formatDate(s.date, 'EEEE, MMMM d, yyyy')}\n\n${s.content.trim()}`)
    downloadText(`${slugify(project.name)}-standups-${format(month, 'yyyy-MM')}.md`, [title, ...body].join('\n\n---\n\n') + '\n')
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 className="toolbar-title">{format(month, 'MMMM yyyy')}</h2>
        <span className="muted">{list.loading ? <Skeleton w={80} /> : plural(entries.length, 'stand-up')}</span>
        <div className="spacer" />
        <button type="button" className="btn btn-sm" disabled={list.loading || entries.length === 0} onClick={downloadMonth}>
          Download month .md
        </button>
      </div>
      {list.loading ? (
        <Loading className="stack">
          <StandupEntriesSkeleton />
        </Loading>
      ) : list.error ? (
        <ErrorBox>{list.error}</ErrorBox>
      ) : entries.length === 0 ? (
        <div className="card empty-day">
          <p className="muted">No stand-ups in {format(month, 'MMMM yyyy')}.</p>
        </div>
      ) : (
        entries.map((s) => (
          <article key={s.id} className="card standup-entry">
            <button type="button" className="standup-entry-date" onClick={() => onOpen(s.date)}>
              {formatDate(s.date, 'EEEE, MMMM d')}
            </button>
            <Markdown>{s.content}</Markdown>
          </article>
        ))
      )}
    </div>
  )
}
