import { Link } from 'react-router'
import { PaymentStatusBadge, SprintStatusBadge } from '../../components/Badges'
import { ErrorBox } from '../../components/Feedback'
import { Markdown } from '../../components/Markdown'
import { NotesView } from '../../components/NotesView'
import * as api from '../../lib/api'
import { formatDate, formatMoney, formatRange, formatRelativeDay, todayISO } from '../../lib/format'
import { meetingWhen } from '../../lib/meetings'
import { paymentStatus, summarizePayments } from '../../lib/payments'
import { currentSprint, progressLabel, sprintProgress } from '../../lib/sprints'
import { useAsync } from '../../lib/useAsync'
import { OverviewSkeleton } from '../skeletons'
import { useProject } from './ProjectLayout'

export function OverviewTab() {
  const { project } = useProject()
  const today = todayISO()
  const base = `/projects/${project.id}`
  const overview = useAsync(
    () =>
      Promise.all([
        api.getLatestStandup(project.id),
        api.listMeetings(project.id),
        api.listSprints(project.id),
        api.listPayments(project.id),
      ]).then(([standup, meetings, sprints, payments]) => ({ standup, meetings, sprints, payments })),
    [project.id],
  )

  if (overview.loading) return <OverviewSkeleton />
  if (overview.error) return <ErrorBox>{overview.error}</ErrorBox>
  if (!overview.data) return null

  const { standup, meetings, sprints, payments } = overview.data
  const upcoming = meetings.filter((m) => m.date >= today).slice(0, 4)
  const sprint = currentSprint(sprints, today)
  const progress = sprint ? sprintProgress(sprint, today) : null
  const nextSprint = sprints.filter((s) => s.start_date > today).at(-1)
  const summary = summarizePayments(payments, today)
  const money = (n: number) => formatMoney(n, project.currency)

  return (
    <div className="overview-grid">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">{standup?.date === today ? "Today's stand-up" : 'Latest stand-up'}</h2>
          <Link className="btn btn-sm" to={`${base}/standups?date=${today}`}>
            {standup?.date === today ? 'Open' : 'Write today'}
          </Link>
        </div>
        {standup ? (
          <>
            <div className="eyebrow">
              {formatDate(standup.date, 'EEEE, MMMM d')} · {formatRelativeDay(standup.date, today)}
            </div>
            <div className="clamp">
              <NotesView content={standup.content} format={standup.content_format} />
            </div>
          </>
        ) : (
          <p className="muted">No stand-ups yet.</p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Upcoming meetings</h2>
          <Link className="btn btn-sm" to={`${base}/meetings`}>
            All meetings
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">No upcoming meetings.</p>
        ) : (
          <ul className="panel-list">
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link to={`${base}/meetings?date=${m.date}&meeting=${m.id}`} className="grow truncate">
                  {m.title}
                </Link>
                <span className="muted small nowrap">{meetingWhen(m, today)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Current sprint</h2>
          <Link className="btn btn-sm" to={`${base}/sprints`}>
            All sprints
          </Link>
        </div>
        {sprint && progress ? (
          <div className="stack-sm">
            <div className="title-row">
              <strong>{sprint.name}</strong>
              <SprintStatusBadge status={sprint.status} />
            </div>
            <div className="muted small">{formatRange(sprint.start_date, sprint.end_date)}</div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="small">{progressLabel(progress)}</div>
            {sprint.goal && (
              <p>
                <strong>Goal:</strong> {sprint.goal}
              </p>
            )}
          </div>
        ) : (
          <p className="muted">
            No sprint covers today.
            {nextSprint && ` Next up: ${nextSprint.name}, ${formatRelativeDay(nextSprint.start_date, today)}.`}
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Payments</h2>
          <Link className="btn btn-sm" to={`${base}/payments`}>
            Timeline
          </Link>
        </div>
        <dl className="meta-list">
          <div>
            <dt>Received</dt>
            <dd className="text-green">{money(summary.paid)}</dd>
          </div>
          <div>
            <dt>Outstanding</dt>
            <dd>{money(summary.outstanding)}</dd>
          </div>
          {summary.overdue > 0 && (
            <div>
              <dt>Overdue</dt>
              <dd className="text-red">{money(summary.overdue)}</dd>
            </div>
          )}
          {project.budget != null && (
            <div>
              <dt>Budget</dt>
              <dd>{money(project.budget)}</dd>
            </div>
          )}
        </dl>
        {summary.next && (
          <div className="next-payment">
            <div className="muted small">Next payment</div>
            <div className="title-row">
              <strong className="grow truncate">{summary.next.title}</strong>
              <PaymentStatusBadge status={paymentStatus(summary.next, today)} />
            </div>
            <div className="small">
              {money(summary.next.amount)} · due {formatDate(summary.next.due_date)} ({formatRelativeDay(summary.next.due_date, today)})
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">About</h2>
        <dl className="meta-list">
          <div>
            <dt>Client</dt>
            <dd>{project.client || '—'}</dd>
          </div>
          <div>
            <dt>Start</dt>
            <dd>{formatDate(project.start_date)}</dd>
          </div>
          <div>
            <dt>End</dt>
            <dd>{formatDate(project.end_date)}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{project.currency}</dd>
          </div>
        </dl>
        {project.description ? <Markdown>{project.description}</Markdown> : <p className="muted">No description.</p>}
      </section>
    </div>
  )
}
