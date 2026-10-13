import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { Skeleton } from './Skeleton'

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <rect x="8" y="9" width="16" height="3" rx="1.5" fill="#fff" />
      <rect x="8" y="15" width="11" height="3" rx="1.5" fill="#fff" opacity=".8" />
      <rect x="8" y="21" width="7" height="3" rx="1.5" fill="#fff" opacity=".6" />
    </svg>
  )
}

function Shell({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Logo />
            Project Status
          </Link>
          <div className="topbar-right">{account}</div>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  )
}

export function Layout() {
  const { session } = useAuth()

  return (
    <Shell
      account={
        <>
          <span className="muted small hide-sm">{session?.user.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </>
      }
    >
      <Outlet />
    </Shell>
  )
}

/** The app chrome with placeholders, shown while the session is being restored. */
export function LayoutSkeleton({ children }: { children: ReactNode }) {
  return (
    <Shell
      account={
        <>
          <span className="small hide-sm">
            <Skeleton w={160} />
          </span>
          <Skeleton w={68} h={30} />
        </>
      }
    >
      {children}
    </Shell>
  )
}
