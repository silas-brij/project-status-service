// Placeholders that mirror each page's layout while its data loads. They reuse the
// real layout classes so content replaces them without shifting the page.
import type { CSSProperties } from 'react'
import { Link, matchPath, useLocation } from 'react-router'
import { Loading, MarkdownSkeleton, Skeleton, StatsSkeleton } from '../components/Skeleton'
import { formatDate, todayISO } from '../lib/format'
import { ProjectTabs } from './project/ProjectTabs'

/** Neutral accent until the project's own color is known. */
const NEUTRAL = { '--project-color': 'var(--skeleton)' } as CSSProperties

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Picks the skeleton for the current URL, used while the session is restored. */
export function PageSkeleton() {
  const { pathname } = useLocation()
  if (matchPath('/projects/:projectId/*', pathname)) return <ProjectSkeleton />
  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">{formatDate(todayISO(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Skeleton w={128} h={36} />
      </div>
      <DashboardSkeleton />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard

export function DashboardSkeleton() {
  return (
    <Loading className="stack-lg">
      <StatsSkeleton labels={['Active projects', 'Stand-ups today', 'Running sprints', 'Overdue payments']} />

      <div className="dash-panels">
        <section className="card">
          <h2 className="card-title">Today's stand-ups</h2>
          <ul className="panel-list">
            {range(3).map((i) => (
              <li key={i}>
                <Skeleton w={10} h={10} round />
                <span className="grow">
                  <Skeleton w={['55%', '40%', '48%'][i]} />
                </span>
                <Skeleton w={54} h={30} />
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="card-title">Meetings · next 7 days</h2>
          <ul className="panel-list">
            {range(3).map((i) => (
              <li key={i}>
                <Skeleton w={10} h={10} round />
                <div className="grow">
                  <div>
                    <Skeleton w={['46%', '58%', '40%'][i]} />
                  </div>
                  <div className="small">
                    <Skeleton w="35%" />
                  </div>
                </div>
                <div className="right small">
                  <Skeleton w={84} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="card-title">Payments due · next 30 days</h2>
          <ul className="panel-list">
            {range(3).map((i) => (
              <li key={i}>
                <Skeleton w={10} h={10} round />
                <div className="grow">
                  <div>
                    <Skeleton w={['50%', '38%', '44%'][i]} />
                  </div>
                  <div className="small">
                    <Skeleton w="62%" />
                  </div>
                </div>
                <div className="right">
                  <Skeleton w={70} />
                  <Skeleton w={58} h={22} round />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="toolbar">
        <h2 className="toolbar-title">All projects</h2>
        <div className="spacer" />
        <Skeleton w={180} h={34} />
        <Skeleton w={180} h={34} />
      </div>

      <div className="project-grid">
        {range(6).map((i) => (
          <div key={i} className="card project-card is-skeleton" style={NEUTRAL}>
            <div className="project-card-top">
              <h3 className="grow">
                <Skeleton w={['60%', '45%', '52%'][i % 3]} />
              </h3>
              <Skeleton w={56} h={22} round />
            </div>
            <div className="small">
              <Skeleton w="35%" />
            </div>
            <dl className="meta-list">
              {['Sprint', 'Last stand-up', 'Next meeting', 'Next payment', 'Outstanding'].map((label, j) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <Skeleton w={[110, 70, 130, 120, 80][j]} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Loading>
  )
}

// ---------------------------------------------------------------------------
// Project page

/** Project header + the skeleton of whichever tab the URL points at. */
export function ProjectSkeleton() {
  const { pathname, search } = useLocation()
  const match = matchPath('/projects/:projectId/*', pathname)
  const tab = match?.params['*'] ?? ''

  return (
    <div className="stack-lg" style={NEUTRAL}>
      <div className="project-header">
        <Link to="/" className="back-link">
          ← All projects
        </Link>
        <div className="page-header">
          <div className="min-w-0 grow">
            <div className="title-row">
              <Skeleton w={14} h={14} round />
              <h1>
                <Skeleton w={220} />
              </h1>
              <Skeleton w={60} h={22} round />
            </div>
            <p>
              <Skeleton w={180} />
            </p>
          </div>
          <Skeleton w={112} h={36} />
        </div>
        <ProjectTabs projectId={match?.params.projectId ?? ''} />
      </div>

      {tab === 'standups' ? (
        <StandupsSkeleton view={new URLSearchParams(search).get('view') === 'month' ? 'month' : 'day'} />
      ) : tab === 'meetings' ? (
        <MeetingsSkeleton />
      ) : tab === 'sprints' ? (
        <SprintsSkeleton />
      ) : tab === 'payments' ? (
        <PaymentsSkeleton />
      ) : (
        <OverviewSkeleton />
      )}
    </div>
  )
}

function ToolbarSkeleton({ title, button }: { title: string; button: number }) {
  return (
    <div className="toolbar">
      <h2 className="toolbar-title">{title}</h2>
      <div className="spacer" />
      <Skeleton w={button} h={36} />
    </div>
  )
}

function CardHeadSkeleton({ title }: { title?: string }) {
  return (
    <div className="card-head">
      <h2 className="card-title">{title ?? <Skeleton w={120} />}</h2>
      <Skeleton w={84} h={30} />
    </div>
  )
}

export function OverviewSkeleton() {
  return (
    <Loading className="overview-grid">
      <section className="card">
        <CardHeadSkeleton />
        <div className="eyebrow">
          <Skeleton w="45%" />
        </div>
        <MarkdownSkeleton sections={2} />
      </section>

      <section className="card">
        <CardHeadSkeleton title="Upcoming meetings" />
        <ul className="panel-list">
          {[140, 110, 160].map((w) => (
            <li key={w}>
              <span className="grow">
                <Skeleton w={w} />
              </span>
              <span className="small">
                <Skeleton w={90} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <CardHeadSkeleton title="Current sprint" />
        <div className="stack-sm">
          <div className="title-row">
            <Skeleton w={110} />
            <Skeleton w={56} h={22} round />
          </div>
          <div className="small">
            <Skeleton w={150} />
          </div>
          <Skeleton h={8} round />
          <div className="small">
            <Skeleton w={120} />
          </div>
        </div>
      </section>

      <section className="card">
        <CardHeadSkeleton title="Payments" />
        <MetaListSkeleton labels={['Received', 'Outstanding', 'Budget']} />
      </section>

      <section className="card">
        <h2 className="card-title">About</h2>
        <MetaListSkeleton labels={['Client', 'Start', 'End', 'Currency']} />
        <p>
          <Skeleton w="85%" />
        </p>
      </section>
    </Loading>
  )
}

function MetaListSkeleton({ labels }: { labels: string[] }) {
  return (
    <dl className="meta-list">
      {labels.map((label, i) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            <Skeleton w={[90, 70, 100, 60][i % 4]} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------------------
// Stand-ups

export function StandupsSkeleton({ view }: { view: 'day' | 'month' }) {
  return (
    <Loading className="stack">
      <div className="toolbar">
        <Skeleton w={112} h={32} />
        <Skeleton w={58} h={30} />
        <div className="spacer" />
        <Skeleton w={124} h={30} />
      </div>
      <div className="standups-layout">
        <aside className="stack">
          <CalendarAsideSkeleton />
        </aside>
        <section className="min-w-0">
          {view === 'month' ? (
            <div className="stack">
              <div className="toolbar">
                <h2 className="toolbar-title">
                  <Skeleton w={140} />
                </h2>
                <div className="spacer" />
                <Skeleton w={150} h={30} />
              </div>
              <StandupEntriesSkeleton />
            </div>
          ) : (
            <article className="card standup-day">
              <header className="standup-day-header">
                <div className="min-w-0 grow">
                  <div className="eyebrow">
                    <Skeleton w={90} />
                  </div>
                  <h2>
                    <Skeleton w={190} />
                  </h2>
                </div>
                <div className="btn-group">
                  <Skeleton w={66} h={30} />
                  <Skeleton w={66} h={30} />
                </div>
              </header>
              <MarkdownSkeleton />
            </article>
          )}
        </section>
      </div>
    </Loading>
  )
}

/** Calendar card + "this month" list card. */
function CalendarAsideSkeleton() {
  return (
    <>
      <div className="card">
        <div className="calendar-header">
          <Skeleton w={30} h={30} />
          <Skeleton w={110} />
          <Skeleton w={30} h={30} />
        </div>
        <Skeleton className="calendar-skeleton" h="auto" />
      </div>
      <div className="card">
        <h3 className="card-title">
          <Skeleton w={150} />
        </h3>
        <DateListSkeleton />
      </div>
    </>
  )
}

/** Rows of the "this month" list next to a calendar. */
export function DateListSkeleton() {
  return (
    <ul className="date-list">
      {[100, 88, 108, 94].map((w) => (
        <li key={w} className="skeleton-row">
          <Skeleton w={w} />
        </li>
      ))}
    </ul>
  )
}

/** Cards of the month feed. */
export function StandupEntriesSkeleton() {
  return (
    <>
      {range(3).map((i) => (
        <div key={i} className="card standup-entry">
          <h3>
            <Skeleton w={160} />
          </h3>
          <MarkdownSkeleton sections={i === 1 ? 3 : 2} />
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Meetings

export function MeetingsSkeleton() {
  return (
    <Loading className="stack">
      <div className="toolbar">
        <Skeleton w={58} h={30} />
        <div className="spacer" />
        <Skeleton w={130} h={36} />
      </div>
      <div className="standups-layout">
        <aside className="stack">
          <CalendarAsideSkeleton />
        </aside>
        <section className="stack min-w-0">
          <header className="meetings-day-header">
            <div className="min-w-0 grow">
              <div className="eyebrow">
                <Skeleton w={90} />
              </div>
              <h2>
                <Skeleton w={190} />
              </h2>
            </div>
            <div className="btn-group">
              <Skeleton w={66} h={30} />
              <Skeleton w={66} h={30} />
            </div>
          </header>
          <MeetingCardsSkeleton />
        </section>
      </div>
    </Loading>
  )
}

/** Meeting cards of the selected day. */
export function MeetingCardsSkeleton() {
  return (
    <>
      {[150, 190].map((w, i) => (
        <div key={w} className="card meeting-card">
          <header>
            <h3 className="meeting-title">
              <Skeleton w={w} />
            </h3>
            <div className="meeting-meta">
              <Skeleton w={160} />
            </div>
          </header>
          <ul className="attendees">
            {[48, 64, 56].map((a) => (
              <li key={a} className="is-skeleton">
                <Skeleton w={a} />
              </li>
            ))}
          </ul>
          <MarkdownSkeleton sections={i ? 2 : 3} />
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Sprints

export function SprintsSkeleton() {
  return (
    <Loading className="stack">
      <ToolbarSkeleton title="Sprints" button={118} />
      <SprintListSkeleton />
    </Loading>
  )
}

export function SprintListSkeleton() {
  return (
    <>
      {[110, 96, 104].map((w) => (
        <div key={w} className="card sprint-card">
          <div className="sprint-card-head">
            <div className="min-w-0 grow">
              <div className="title-row">
                <h3>
                  <Skeleton w={w} />
                </h3>
                <Skeleton w={62} h={22} round />
              </div>
              <div className="small">
                <Skeleton w={190} />
              </div>
            </div>
            <div className="btn-group">
              <Skeleton w={82} h={30} />
              <Skeleton w={46} h={30} />
              <Skeleton w={60} h={30} />
            </div>
          </div>
          <Skeleton h={8} round />
          <div className="small">
            <Skeleton w={140} />
          </div>
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Payments

export function PaymentsSkeleton() {
  return (
    <Loading className="stack">
      <PaymentsSummarySkeleton />
      <ToolbarSkeleton title="Payment timeline" button={124} />
      <PaymentTimelineSkeleton />
    </Loading>
  )
}

/** Stat cards + budget bar. */
export function PaymentsSummarySkeleton() {
  return (
    <>
      <StatsSkeleton labels={['Scheduled', 'Received', 'Outstanding', 'Overdue']} />
      <div className="card">
        <Skeleton h={12} round />
        <div className="budget-legend small">
          <Skeleton w={130} />
          <Skeleton w={150} />
          <Skeleton w={170} />
        </div>
      </div>
    </>
  )
}

export function PaymentTimelineSkeleton() {
  return (
    <ol className="timeline">
      {['40%', '55%', '32%'].map((w) => (
        <li key={w} className="timeline-item is-skeleton">
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-date">
            <strong>
              <Skeleton w={44} />
            </strong>
            <span>
              <Skeleton w={32} />
            </span>
          </div>
          <div className="card timeline-card">
            <div className="timeline-card-main">
              <div className="grow">
                <div className="timeline-title">
                  <Skeleton w={w} />
                </div>
                <div className="small">
                  <Skeleton w="25%" />
                </div>
              </div>
              <div className="timeline-amount">
                <Skeleton w={84} />
              </div>
            </div>
            <div className="timeline-card-actions">
              <Skeleton w={64} h={22} round />
              <div className="spacer" />
              <Skeleton w={88} h={30} />
              <Skeleton w={44} h={30} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
