import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { addDays, subDays } from 'date-fns'
import { PaymentStatusBadge, ProjectStatusBadge } from '../components/Badges'
import { EmptyState, ErrorBox } from '../components/Feedback'
import { Stat } from '../components/Stat'
import * as api from '../lib/api'
import { cx, formatDate, formatMoney, formatRelativeDay, plural, toISODate, todayISO } from '../lib/format'
import { meetingWhen } from '../lib/meetings'
import { isOpenPayment, paymentStatus, summarizePayments } from '../lib/payments'
import { currentSprint, progressLabel, sprintProgress } from '../lib/sprints'
import { OPEN_PROJECT_STATUSES, PROJECT_STATUS, PROJECT_STATUSES } from '../lib/status'
import type { Project, ProjectStatus } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { ProjectFormModal } from './ProjectFormModal'
import { DashboardSkeleton } from './skeletons'

type Filter = 'open' | 'all' | ProjectStatus

const UPCOMING_DAYS = 30
const MEETING_DAYS = 7

export function DashboardPage() {
  const today = todayISO()
  const since = toISODate(subDays(new Date(), 60))
  const dash = useAsync(() => api.loadDashboard(since, today), [since, today])
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">{formatDate(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + New project
        </button>
      </div>

      {dash.error ? (
        <ErrorBox>{dash.error}</ErrorBox>
      ) : dash.data ? (
        <DashboardContent data={dash.data} today={today} onCreate={() => setCreating(true)} />
      ) : (
        <DashboardSkeleton />
      )}

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onSaved={(p) => navigate(`/projects/${p.id}`)}
        />
      )}
    </div>
  )
}

interface DashboardContentProps {
  data: api.DashboardData
  today: string
  onCreate: () => void
}

function DashboardContent({ data, today, onCreate }: DashboardContentProps) {
  const [filter, setFilter] = useState<Filter>('open')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const { projects, sprints, payments, standups, meetings } = data
    return projects.map((project) => {
      const lastStandup = standups
        .filter((s) => s.project_id === project.id)
        .reduce<string | null>((max, s) => (!max || s.date > max ? s.date : max), null)
      return {
        project,
        sprint: currentSprint(sprints.filter((s) => s.project_id === project.id), today),
        payments: summarizePayments(payments.filter((p) => p.project_id === project.id), today),
        lastStandup,
        // Meetings are sorted by date and time, so the first one is the next.
        nextMeeting: meetings.find((m) => m.project_id === project.id) ?? null,
      }
    })
  }, [data, today])

  const active = rows.filter((r) => r.project.status === 'active')
  const notStarted = rows.filter((r) => r.project.status === 'not_started').length
  const standupsDone = active.filter((r) => r.lastStandup === today).length
  const runningSprints = rows.filter((r) => r.sprint).length
  const overdueCount = rows.reduce((n, r) => n + r.payments.overdueCount, 0)

  const projectById = new Map(rows.map((r) => [r.project.id, r.project]))
  const horizon = toISODate(addDays(new Date(), UPCOMING_DAYS))
  const duePayments = data.payments
    .filter((p) => isOpenPayment(p) && p.due_date <= horizon && projectById.get(p.project_id)?.status !== 'archived')
    .slice(0, 8)
  const meetingHorizon = toISODate(addDays(new Date(), MEETING_DAYS))
  const upcomingMeetings = data.meetings
    .filter((m) => m.date <= meetingHorizon && projectById.get(m.project_id)?.status !== 'archived')
    .slice(0, 8)

  const q = query.trim().toLowerCase()
  const visible = rows.filter(({ project: p }) => {
    const statusOk = filter === 'all' || (filter === 'open' ? OPEN_PROJECT_STATUSES.has(p.status) : p.status === filter)
    const queryOk = !q || p.name.toLowerCase().includes(q) || (p.client ?? '').toLowerCase().includes(q)
    return statusOk && queryOk
  })

  if (rows.length === 0) {
    return (
      <EmptyState title="No projects yet">
        <p className="muted">Create a project to start tracking stand-ups, sprints and payments.</p>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          Create your first project
        </button>
      </EmptyState>
    )
  }

  return (
    <>
      <div className="stats">
        <Stat
          label="Active projects"
          value={active.length}
          hint={notStarted ? `${notStarted} not started · ${rows.length} in total` : `${rows.length} in total`}
        />
        <Stat
          label="Stand-ups today"
          value={`${standupsDone} / ${active.length}`}
          tone={active.length && standupsDone === active.length ? 'green' : undefined}
          hint="Active projects"
        />
        <Stat label="Running sprints" value={runningSprints} />
        <Stat
          label="Overdue payments"
          value={overdueCount}
          tone={overdueCount ? 'red' : 'green'}
          hint={overdueCount ? 'Needs follow-up' : 'All on track'}
        />
      </div>

      <div className="dash-panels">
        <section className="card">
          <h2 className="card-title">Today's stand-ups</h2>
          {active.length === 0 ? (
            <p className="muted">No active projects.</p>
          ) : (
            <ul className="panel-list">
              {active.map(({ project: p, lastStandup }) => (
                <li key={p.id}>
                  <span className="color-dot" style={{ background: p.color }} />
                  <Link to={`/projects/${p.id}`} className="grow truncate">
                    {p.name}
                  </Link>
                  {lastStandup === today ? (
                    <span className="text-green small">✓ Done</span>
                  ) : (
                    <Link className="btn btn-sm" to={`/projects/${p.id}/standups?date=${today}`}>
                      Write
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Meetings · next {MEETING_DAYS} days</h2>
          {upcomingMeetings.length === 0 ? (
            <p className="muted">No meetings scheduled.</p>
          ) : (
            <ul className="panel-list">
              {upcomingMeetings.map((m) => {
                const project = projectById.get(m.project_id)
                return (
                  <li key={m.id}>
                    <span className="color-dot" style={{ background: project?.color }} />
                    <Link to={`/projects/${m.project_id}/meetings?date=${m.date}&meeting=${m.id}`} className="grow min-w-0">
                      <div className="truncate">{m.title}</div>
                      <div className="muted small truncate">{project?.name}</div>
                    </Link>
                    <div className="right small nowrap">{meetingWhen(m, today)}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Payments due · next {UPCOMING_DAYS} days</h2>
          {duePayments.length === 0 ? (
            <p className="muted">Nothing due. 🎉</p>
          ) : (
            <ul className="panel-list">
              {duePayments.map((pay) => {
                const project = projectById.get(pay.project_id)
                const status = paymentStatus(pay, today)
                return (
                  <li key={pay.id}>
                    <span className="color-dot" style={{ background: project?.color }} />
                    <Link to={`/projects/${pay.project_id}/payments`} className="grow min-w-0">
                      <div className="truncate">{pay.title}</div>
                      <div className="muted small truncate">
                        {project?.name} · due {formatRelativeDay(pay.due_date, today)}
                      </div>
                    </Link>
                    <div className="right">
                      <div className="nowrap">{formatMoney(pay.amount, project?.currency ?? 'USD')}</div>
                      <PaymentStatusBadge status={status} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="toolbar">
        <h2 className="toolbar-title">All projects</h2>
        <div className="spacer" />
        <input className="search" type="search" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by status">
          <option value="open">Open projects</option>
          <option value="all">All projects</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS[s].label}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="muted">No projects match this filter.</p>
      ) : (
        <div className="project-grid">
          {visible.map(({ project: p, sprint, payments, lastStandup, nextMeeting }) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card project-card" style={{ '--project-color': p.color } as CSSProperties}>
              <div className="project-card-top">
                <h3 className="truncate">{p.name}</h3>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="muted small truncate">
                {p.client || 'No client'}
                {startsLabel(p, today)}
              </div>
              <dl className="meta-list">
                <div>
                  <dt>Sprint</dt>
                  <dd className="truncate">{sprint ? `${sprint.name} · ${progressLabel(sprintProgress(sprint, today))}` : '—'}</dd>
                </div>
                <div>
                  <dt>Last stand-up</dt>
                  <dd className={cx(lastStandup === today && 'text-green')}>
                    {lastStandup ? formatRelativeDay(lastStandup, today) : 'None recently'}
                  </dd>
                </div>
                <div>
                  <dt>Next meeting</dt>
                  <dd className="truncate">{nextMeeting ? `${meetingWhen(nextMeeting, today)} · ${nextMeeting.title}` : '—'}</dd>
                </div>
                <div>
                  <dt>Next payment</dt>
                  <dd className={cx(payments.next && payments.next.due_date < today && 'text-red')}>
                    {payments.next
                      ? `${formatMoney(payments.next.amount, p.currency)} · ${formatDate(payments.next.due_date, 'MMM d')}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Outstanding</dt>
                  <dd>
                    {formatMoney(payments.outstanding, p.currency)}
                    {payments.overdueCount > 0 && <span className="text-red"> · {plural(payments.overdueCount, 'overdue')}</span>}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

/** " · Starts in 5 days" for a project that hasn't started yet. */
function startsLabel(p: Project, today: string) {
  if (p.status !== 'not_started' || !p.start_date) return null
  const when = formatRelativeDay(p.start_date, today)
  return p.start_date >= today ? ` · Starts ${when}` : ` · Was due to start ${when}`
}
