import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { addDays, parseISO } from 'date-fns'
import { SprintStatusBadge } from '../../components/Badges'
import { EmptyState, ErrorBox } from '../../components/Feedback'
import { Field } from '../../components/Field'
import { Markdown } from '../../components/Markdown'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { Modal } from '../../components/Modal'
import { Loading } from '../../components/Skeleton'
import * as api from '../../lib/api'
import { cx, errorMessage, formatRange, toISODate, todayISO } from '../../lib/format'
import { progressLabel, sprintProgress } from '../../lib/sprints'
import { SPRINT_STATUS, SPRINT_STATUSES } from '../../lib/status'
import type { Sprint, SprintStatus } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { SprintListSkeleton } from '../skeletons'
import { useProject } from './ProjectLayout'

export function SprintsTab() {
  const { project } = useProject()
  const sprints = useAsync(() => api.listSprints(project.id), [project.id])
  const [editing, setEditing] = useState<Sprint | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = todayISO()
  const list = sprints.data ?? []

  async function remove(s: Sprint) {
    if (!window.confirm(`Delete "${s.name}"?`)) return
    try {
      await api.deleteSprint(s.id)
      sprints.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 className="toolbar-title">Sprints</h2>
        <div className="spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + New sprint
        </button>
      </div>

      {(error || sprints.error) && <ErrorBox>{error ?? sprints.error}</ErrorBox>}

      {sprints.loading && !sprints.data ? (
        <Loading className="stack">
          <SprintListSkeleton />
        </Loading>
      ) : list.length === 0 ? (
        <EmptyState title="No sprints yet">
          <p className="muted">Plan your work in time-boxed sprints. They also show up on the stand-up calendar.</p>
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            Plan the first sprint
          </button>
        </EmptyState>
      ) : (
        list.map((s) => {
          const progress = sprintProgress(s, today)
          const standupDate = progress.phase === 'running' ? today : s.start_date
          return (
            <article key={s.id} className={cx('card sprint-card', progress.phase === 'running' && 'is-current')}>
              <div className="sprint-card-head">
                <div className="min-w-0">
                  <div className="title-row">
                    <h3 className="truncate">{s.name}</h3>
                    <SprintStatusBadge status={s.status} />
                  </div>
                  <div className="muted small">
                    {formatRange(s.start_date, s.end_date)} · {progress.totalDays} days
                  </div>
                </div>
                <div className="btn-group">
                  <Link className="btn btn-sm" to={`/projects/${project.id}/standups?date=${standupDate}`}>
                    Stand-ups
                  </Link>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(s)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => remove(s)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${progress.pct}%` }} />
              </div>
              <div className="muted small">{progressLabel(progress)}</div>
              {s.goal && (
                <p className="sprint-goal">
                  <strong>Goal:</strong> {s.goal}
                </p>
              )}
              {s.notes && (
                <details className="sprint-notes">
                  <summary>Notes</summary>
                  <Markdown>{s.notes}</Markdown>
                </details>
              )}
            </article>
          )
        })
      )}

      {editing && (
        <SprintFormModal
          projectId={project.id}
          sprint={editing === 'new' ? undefined : editing}
          existing={list}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            sprints.reload()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function defaultsFor(existing: Sprint[]) {
  const today = todayISO()
  const lastEnd = existing.reduce<string | null>((max, s) => (!max || s.end_date > max ? s.end_date : max), null)
  const dayAfterLast = lastEnd ? toISODate(addDays(parseISO(lastEnd), 1)) : null
  const start = dayAfterLast && dayAfterLast >= today ? dayAfterLast : today
  return {
    name: `Sprint ${existing.length + 1}`,
    goal: '',
    start_date: start,
    end_date: toISODate(addDays(parseISO(start), 13)),
    status: (start <= today ? 'active' : 'planned') as SprintStatus,
    notes: '',
  }
}

interface SprintFormModalProps {
  projectId: string
  sprint?: Sprint
  existing: Sprint[]
  onClose: () => void
  onSaved: () => void
}

function SprintFormModal({ projectId, sprint, existing, onClose, onSaved }: SprintFormModalProps) {
  const [form, setForm] = useState(() =>
    sprint
      ? {
          name: sprint.name,
          goal: sprint.goal ?? '',
          start_date: sprint.start_date,
          end_date: sprint.end_date,
          status: sprint.status,
          notes: sprint.notes ?? '',
        }
      : defaultsFor(existing),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setWeeks = (weeks: number) =>
    form.start_date && set('end_date', toISODate(addDays(parseISO(form.start_date), weeks * 7 - 1)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (form.end_date < form.start_date) return setError('The end date must be on or after the start date.')
    setBusy(true)
    setError(null)
    try {
      const input = {
        name: form.name.trim(),
        goal: form.goal.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (sprint) await api.updateSprint(sprint.id, input)
      else await api.createSprint(projectId, input)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={sprint ? 'Edit sprint' : 'New sprint'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="modal-body">
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="form-grid">
            <Field label="Name">
              <input required autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value as SprintStatus)}>
                {SPRINT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SPRINT_STATUS[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date">
              <input type="date" required value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field
              label="End date"
              hint={
                <span className="btn-row">
                  {[1, 2, 3, 4].map((w) => (
                    <button key={w} type="button" className="link-btn" onClick={() => setWeeks(w)}>
                      {w} wk
                    </button>
                  ))}
                </span>
              }
            >
              <input type="date" required value={form.end_date} min={form.start_date} onChange={(e) => set('end_date', e.target.value)} />
            </Field>
            <Field label="Sprint goal" className="span-2">
              <input value={form.goal} onChange={(e) => set('goal', e.target.value)} placeholder="What should be true at the end of this sprint?" />
            </Field>
            <div className="field span-2">
              <span className="field-label">Notes</span>
              <MarkdownEditor label="Sprint notes" value={form.notes} onChange={(v) => set('notes', v)} rows={8} placeholder="Scope, tickets, retro notes…" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : sprint ? 'Save changes' : 'Create sprint'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
