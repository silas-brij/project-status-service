import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

interface RequireAuthProps {
  children: ReactNode
  /** Shown while the session is being restored. */
  fallback?: ReactNode
}

export function RequireAuth({ children, fallback = null }: RequireAuthProps) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return fallback
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
