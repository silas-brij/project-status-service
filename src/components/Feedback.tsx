import type { ReactNode } from 'react'

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-error" role="alert">
      {children}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card empty-state">
      <h3>{title}</h3>
      {children}
    </div>
  )
}
