import { useState, type CSSProperties } from 'react'
import { Link, Outlet, useNavigate, useOutletContext, useParams } from 'react-router'
import { ProjectStatusBadge } from '../../components/Badges'
import { ErrorBox } from '../../components/Feedback'
import * as api from '../../lib/api'
import { formatRange } from '../../lib/format'
import type { Project } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { ProjectFormModal } from '../ProjectFormModal'
import { ProjectSkeleton } from '../skeletons'
import { ProjectTabs } from './ProjectTabs'

interface ProjectContext {
  project: Project
}

export const useProject = () => useOutletContext<ProjectContext>()

export function ProjectLayout() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { data: project, error, loading, mutate } = useAsync(() => api.getProject(projectId), [projectId])
  const [editing, setEditing] = useState(false)

  if (loading && !project) return <ProjectSkeleton />
  if (error || !project) {
    return (
      <div className="stack">
        <Link to="/" className="back-link">
          ← All projects
        </Link>
        <ErrorBox>{error ?? 'Project not found.'}</ErrorBox>
      </div>
    )
  }

  return (
    <div className="stack-lg" style={{ '--project-color': project.color } as CSSProperties}>
      <div className="project-header">
        <Link to="/" className="back-link">
          ← All projects
        </Link>
        <div className="page-header">
          <div className="min-w-0">
            <div className="title-row">
              <span className="color-dot color-dot-lg" />
              <h1 className="truncate">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="muted">
              {[project.client, project.start_date && project.end_date ? formatRange(project.start_date, project.end_date) : null]
                .filter(Boolean)
                .join(' · ') || 'No client'}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Edit project
          </button>
        </div>
        <ProjectTabs projectId={project.id} />
      </div>

      <Outlet context={{ project } satisfies ProjectContext} />

      {editing && (
        <ProjectFormModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={(p) => {
            mutate(p)
            setEditing(false)
          }}
          onDeleted={() => navigate('/', { replace: true })}
        />
      )}
    </div>
  )
}
