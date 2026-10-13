import { NavLink } from 'react-router'

const TABS = [
  { path: '', label: 'Overview' },
  { path: 'standups', label: 'Stand-ups' },
  { path: 'meetings', label: 'Meetings' },
  { path: 'sprints', label: 'Sprints' },
  { path: 'payments', label: 'Payments' },
]

export function ProjectTabs({ projectId }: { projectId: string }) {
  const base = `/projects/${projectId}`
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <NavLink
          key={t.path}
          to={t.path ? `${base}/${t.path}` : base}
          end={!t.path}
          className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
