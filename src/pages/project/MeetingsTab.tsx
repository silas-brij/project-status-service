import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { Calendar } from '../../components/Calendar'
import { ErrorBox } from '../../components/Feedback'
import { Field } from '../../components/Field'
import { FullView } from '../../components/FullView'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { NotesView } from '../../components/NotesView'
import { Modal } from '../../components/Modal'
import { Loading, MarkdownSkeleton, Skeleton } from '../../components/Skeleton'
import * as api from '../../lib/api'
import { cx, errorMessage, formatDate, isISODate, plural, todayISO } from '../../lib/format'
import {
  MEETING_SUGGESTIONS,
  MEETING_TEMPLATE,
  formatTime,
  isLink,
  linkLabel,
  downloadMeeting,
  meetingDownloadExt,
  meetingTime,
  parseAttendees,
} from '../../lib/meetings'
import { isBlankNotes, NOTES_FILE_ACCEPT, readNotesFile, toMarkdown } from '../../lib/notesFile'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { sprintForDate } from '../../lib/sprints'
import type { Meeting, MeetingInput, MeetingSummary, NotesFormat, Project } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useCalendarMonth } from '../../lib/useCalendarMonth'
import { DateListSkeleton, MeetingCardSkeleton } from '../skeletons'
import { useProject } from './ProjectLayout'

/** An existing meeting, or the date a new one starts on. */
type Editing = { meeting: Meeting } | { date: string }

export function MeetingsTab() {
  const { project } = useProject()
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date')
  const selected = isISODate(dateParam) ? dateParam : todayISO()
  const [month, setMonth] = useCalendarMonth(selected)

  const meetings = useAsync(() => api.listMeetings(project.id), [project.id])
  const sprints = useAsync(() => api.listSprints(project.id), [project.id])
  const day = useAsync(() => api.listMeetingsOn(project.id, selected), [project.id, selected])
  const [editing, setEditing] = useState<Editing | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dates = useMemo(() => new Set((meetings.data ?? []).map((m) => m.date)), [meetings.data])
  const ranges = useMemo(
    () => (sprints.data ?? []).map((s) => ({ start: s.start_date, end: s.end_date, label: s.name })),
    [sprints.data],
  )
  const all = meetings.data ?? []
  const monthMeetings = all.filter((m) => isSameMonth(parseISO(m.date), month))
  const sprint = sprintForDate(sprints.data ?? [], selected)

  // One meeting is shown at a time (`&meeting=<id>`); without one, the day's first.
  // Full view links from before `meeting` existed still pick the meeting they show.
  const fullId = params.get('full')
  const meetingId = params.get('meeting') ?? fullId
  const dayMeetings: MeetingSummary[] = day.data ?? all.filter((m) => m.date === selected)
  const current = dayMeetings.find((m) => m.id === meetingId) ?? dayMeetings[0]
  const shown = current && day.data?.find((m) => m.id === current.id)
  // Prev/Next step through meetings one by one, across days.
  const index = current ? all.findIndex((m) => m.id === current.id) : -1
  const prev = index >= 0 ? all[index - 1] : all.findLast((m) => m.date < selected)
  const next = index >= 0 ? all[index + 1] : all.find((m) => m.date > selected)

  const go = (date: string) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('date', date)
      p.delete('meeting')
      return p
    })
  const select = (m: Pick<MeetingSummary, 'id' | 'date'>) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('date', m.date)
      p.set('meeting', m.id)
      return p
    })

  // Full view of one meeting is part of the URL (`&full=<meeting id>`).
  const fullIndex = fullId ? all.findIndex((m) => m.id === fullId) : -1
  const openFull = (m: MeetingSummary) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('date', m.date)
      p.set('meeting', m.id)
      p.set('full', m.id)
      return p
    })
  // Closing leaves the meeting you were reading selected.
  const closeFull = () =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        const id = p.get('full')
        if (id) p.set('meeting', id)
        p.delete('full')
        return p
      },
      { replace: true },
    )

  function refresh() {
    meetings.reload()
    day.reload()
  }

  async function remove(m: Meeting) {
    if (!window.confirm(`Delete "${m.title}"?`)) return
    setError(null)
    try {
      await api.deleteMeeting(m.id)
      if (day.data) day.mutate(day.data.filter((x) => x.id !== m.id))
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setMonth(startOfMonth(new Date()))
            go(todayISO())
          }}
        >
          Today
        </button>
        <div className="spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ date: selected })}>
          + New meeting
        </button>
      </div>

      {(error || meetings.error) && <ErrorBox>{error ?? meetings.error}</ErrorBox>}

      <div className="standups-layout">
        <aside className="stack">
          <div className="card">
            <Calendar
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={go}
              marked={dates}
              markedLabel="Meeting"
              ranges={ranges}
            />
          </div>
          <div className="card">
            <h3 className="card-title">
              {format(month, 'MMMM')} · {meetings.data ? plural(monthMeetings.length, 'meeting') : <Skeleton w={80} />}
            </h3>
            {!meetings.data ? (
              !meetings.error && <DateListSkeleton />
            ) : monthMeetings.length === 0 ? (
              <p className="muted small">Nothing this month.</p>
            ) : (
              <ul className="date-list">
                {monthMeetings.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={cx('date-list-item', m.id === current?.id && 'active')}
                      aria-current={m.id === current?.id || undefined}
                      onClick={() => select(m)}
                    >
                      <span className="truncate">{m.title}</span>
                      <span className="muted small nowrap">
                        {formatDate(m.date, 'EEE d')}
                        {m.start_time && ` · ${formatTime(m.start_time)}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="stack min-w-0">
          <header className="meetings-day-header">
            <div className="min-w-0">
              <div className="eyebrow">
                {format(parseISO(selected), 'EEEE')}
                {selected === todayISO() && ' · Today'}
              </div>
              <h2>{formatDate(selected, 'MMMM d, yyyy')}</h2>
              {sprint && <span className="chip">{sprint.name}</span>}
            </div>
            <div className="btn-group">
              <button type="button" className="btn btn-sm" disabled={!prev} onClick={() => prev && select(prev)} title="Previous meeting">
                ‹ Prev
              </button>
              <button type="button" className="btn btn-sm" disabled={!next} onClick={() => next && select(next)} title="Next meeting">
                Next ›
              </button>
            </div>
          </header>

          {dayMeetings.length > 1 && (
            <div className="segmented day-meetings" role="group" aria-label={`${dayMeetings.length} meetings on this day`}>
              {dayMeetings.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={cx(m.id === current?.id && 'active')}
                  aria-current={m.id === current?.id || undefined}
                  onClick={() => select(m)}
                >
                  {m.start_time && <span className="day-meeting-time">{formatTime(m.start_time)} </span>}
                  <span className="truncate">{m.title}</span>
                </button>
              ))}
            </div>
          )}

          {!day.data ? (
            day.error ? (
              <ErrorBox>{day.error}</ErrorBox>
            ) : (
              <Loading>
                <MeetingCardSkeleton />
              </Loading>
            )
          ) : !shown ? (
            <div className="card empty-day">
              <p className="muted">No meetings on this day.</p>
              <button type="button" className="btn btn-primary" onClick={() => setEditing({ date: selected })}>
                Schedule a meeting
              </button>
            </div>
          ) : (
            <MeetingCard
              key={shown.id}
              meeting={shown}
              project={project}
              onFullView={() => openFull(shown)}
              onEdit={() => setEditing({ meeting: shown })}
              onDelete={() => remove(shown)}
            />
          )}
        </section>
      </div>

      {fullId && (
        <MeetingFullView
          project={project}
          meeting={day.data?.find((m) => m.id === fullId)}
          loading={!day.data && !day.error}
          prev={fullIndex > 0 ? all[fullIndex - 1] : undefined}
          next={fullIndex >= 0 ? all[fullIndex + 1] : undefined}
          onOpen={openFull}
          onClose={closeFull}
          onEdit={(m) => setEditing({ meeting: m })}
        />
      )}

      {editing && (
        <MeetingFormModal
          projectId={project.id}
          meeting={'meeting' in editing ? editing.meeting : undefined}
          date={'date' in editing ? editing.date : selected}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null)
            // Show the saved meeting right away; the reload puts it in time order.
            if (saved.date === selected && day.data) {
              day.mutate(day.data.some((m) => m.id === saved.id) ? day.data.map((m) => (m.id === saved.id ? saved : m)) : [...day.data, saved])
            }
            select(saved)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Location({ location }: { location: string }) {
  return isLink(location) ? (
    <a href={location} target="_blank" rel="noreferrer">
      {linkLabel(location)}
    </a>
  ) : (
    <span>{location}</span>
  )
}

function Attendees({ names }: { names: string[] }) {
  if (names.length === 0) return null
  return (
    <ul className="attendees" aria-label="Attendees">
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  )
}

const notesOf = (m: Meeting) =>
  m.notes.trim() ? <NotesView content={m.notes} format={m.notes_format} /> : <p className="muted">No notes yet.</p>

interface MeetingCardProps {
  meeting: Meeting
  project: Project
  onFullView: () => void
  onEdit: () => void
  onDelete: () => void
}

function MeetingCard({ meeting: m, project, onFullView, onEdit, onDelete }: MeetingCardProps) {
  return (
    <article className="card meeting-card">
      <header className="meeting-card-head">
        <div className="min-w-0">
          <h3 className="meeting-title">{m.title}</h3>
          <div className="meeting-meta">
            <span>{meetingTime(m) ?? 'No time set'}</span>
            {m.location && <Location location={m.location} />}
          </div>
        </div>
        <button type="button" className="btn btn-sm" onClick={onFullView} title="Read in a full-window view">
          Full view
        </button>
      </header>
      <Attendees names={m.attendees} />
      {notesOf(m)}
      <footer className="standup-day-footer">
        <span className="muted small">Last edited {format(parseISO(m.updated_at), 'MMM d, HH:mm')}</span>
        <div className="spacer" />
        <button type="button" className="btn btn-sm btn-danger-ghost" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="btn btn-sm" onClick={() => downloadMeeting(m, project.name)}>
          Download .{meetingDownloadExt(m)}
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={onEdit}>
          Edit
        </button>
      </footer>
    </article>
  )
}

// ---------------------------------------------------------------------------

interface MeetingFullViewProps {
  project: Project
  /** Undefined while loading, or when the meeting no longer exists. */
  meeting: Meeting | undefined
  loading: boolean
  prev?: MeetingSummary
  next?: MeetingSummary
  onOpen: (meeting: MeetingSummary) => void
  onClose: () => void
  onEdit: (meeting: Meeting) => void
}

function MeetingFullView({ project, meeting: m, loading, prev, next, onOpen, onClose, onEdit }: MeetingFullViewProps) {
  const time = m && meetingTime(m)
  return (
    <FullView
      label={m ? `Meeting, ${m.title}` : 'Meeting'}
      itemName="meeting"
      accent={project.color}
      context={
        <>
          <span className="color-dot" />
          <span className="truncate">{project.name} · Meeting</span>
        </>
      }
      onClose={onClose}
      onPrev={prev ? () => onOpen(prev) : undefined}
      onNext={next ? () => onOpen(next) : undefined}
      actions={
        m && (
          <>
            <button type="button" className="btn btn-sm" onClick={() => downloadMeeting(m, project.name)}>
              Download .{meetingDownloadExt(m)}
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => onEdit(m)}>
              Edit
            </button>
          </>
        )
      }
    >
      {m ? (
        <article className="fullview-doc">
          <header className="fullview-head">
            <div className="eyebrow">
              {formatDate(m.date, 'EEEE, MMMM d, yyyy')}
              {time && ` · ${time}`}
            </div>
            <h1>{m.title}</h1>
            {m.location && (
              <div className="meeting-meta">
                <Location location={m.location} />
              </div>
            )}
          </header>
          <Attendees names={m.attendees} />
          {notesOf(m)}
          <p className="muted small fullview-foot">Last edited {format(parseISO(m.updated_at), 'MMM d, HH:mm')}</p>
        </article>
      ) : loading ? (
        <Loading className="fullview-doc">
          <header className="fullview-head">
            <div className="eyebrow">
              <Skeleton w={220} />
            </div>
            <h1>
              <Skeleton w="55%" />
            </h1>
          </header>
          <MarkdownSkeleton />
        </Loading>
      ) : (
        <div className="fullview-doc empty-day">
          <p className="muted">This meeting doesn't exist anymore.</p>
          <button type="button" className="btn" onClick={onClose}>
            Back to meetings
          </button>
        </div>
      )}
    </FullView>
  )
}

// ---------------------------------------------------------------------------

// Ignores spacing, which the formatted editor may change without any edit to the text.
const isUntouchedTemplate = (notes: string) => notes.replace(/\s+/g, '') === MEETING_TEMPLATE.replace(/\s+/g, '')

/** Notes as saved: HTML is cleaned, and an untouched template or a blank document is not worth keeping. */
function notesInput(notes: string, format: NotesFormat): Pick<MeetingInput, 'notes' | 'notes_format'> {
  if (format === 'html') {
    return isBlankNotes(notes, 'html') ? { notes: '', notes_format: 'markdown' } : { notes: sanitizeHtml(notes), notes_format: 'html' }
  }
  return { notes: isUntouchedTemplate(notes) ? '' : notes, notes_format: 'markdown' }
}

interface MeetingFormModalProps {
  projectId: string
  meeting?: Meeting
  /** Date for a new meeting. */
  date: string
  onClose: () => void
  onSaved: (meeting: Meeting) => void
}

function MeetingFormModal({ projectId, meeting, date, onClose, onSaved }: MeetingFormModalProps) {
  const [initial] = useState(() => ({
    title: meeting?.title ?? '',
    date: meeting?.date ?? date,
    start_time: meeting?.start_time ? formatTime(meeting.start_time) : '',
    end_time: meeting?.end_time ? formatTime(meeting.end_time) : '',
    location: meeting?.location ?? '',
    attendees: meeting?.attendees.join(', ') ?? '',
    notes: meeting?.notes.trim() ? meeting.notes : MEETING_TEMPLATE,
    notes_format: meeting?.notes.trim() ? meeting.notes_format : ('markdown' as NotesFormat),
  }))
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  function close() {
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)
    if (dirty && !window.confirm('Discard your changes to this meeting?')) return
    onClose()
  }

  async function loadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const notes = await readNotesFile(file)
      setForm((f) => ({ ...f, notes: notes.content, notes_format: notes.format }))
    } catch (err) {
      setError(`Couldn't read ${file.name}: ${errorMessage(err)}`)
    }
  }

  async function convertToMarkdown() {
    try {
      const notes = await toMarkdown(form.notes, 'html')
      setForm((f) => ({ ...f, notes, notes_format: 'markdown' }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (form.end_time && !form.start_time) return setError('Set a start time, or clear the end time.')
    if (form.start_time && form.end_time && form.end_time <= form.start_time) return setError('The meeting must end after it starts.')
    setBusy(true)
    setError(null)
    try {
      const input: MeetingInput = {
        title: form.title.trim(),
        date: form.date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        attendees: parseAttendees(form.attendees),
        ...notesInput(form.notes, form.notes_format),
      }
      onSaved(meeting ? await api.updateMeeting(meeting.id, input) : await api.createMeeting(projectId, input))
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={meeting ? 'Edit meeting' : 'New meeting'} onClose={close} wide>
      <form ref={formRef} onSubmit={submit}>
        <div className="modal-body">
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="form-grid">
            <Field label="Title" className="span-2">
              <input
                required
                autoFocus
                list="meeting-suggestions"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Sprint planning, Client demo"
              />
              <datalist id="meeting-suggestions">
                {MEETING_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Date">
              <input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <div className="field">
              <span className="field-label">Time (optional)</span>
              <div className="time-range">
                <input type="time" aria-label="Start time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
                <span className="muted">–</span>
                <input type="time" aria-label="End time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
              </div>
            </div>
            <Field label="Location or link">
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Room 3, or https://meet.google.com/…" />
            </Field>
            <Field label="Attendees" hint="Separate names with commas.">
              <input value={form.attendees} onChange={(e) => set('attendees', e.target.value)} placeholder="Ana, Ben, Client team" />
            </Field>
            <div className="field span-2">
              <div className="field-label-row">
                <span className="field-label">Notes</span>
                <button type="button" className="link-btn small" onClick={() => fileInput.current?.click()}>
                  Load .md or .html file
                </button>
                <input ref={fileInput} type="file" accept={NOTES_FILE_ACCEPT} hidden onChange={loadFile} />
              </div>
              <MarkdownEditor
                label="Meeting notes"
                value={form.notes}
                onChange={(v) => set('notes', v)}
                format={form.notes_format}
                onConvertToMarkdown={convertToMarkdown}
                rows={12}
                onSubmitShortcut={() => formRef.current?.requestSubmit()}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <span className="muted small hide-sm">Ctrl + Enter to save</span>
          <div className="spacer" />
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : meeting ? 'Save changes' : 'Create meeting'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
