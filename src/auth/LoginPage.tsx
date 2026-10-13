import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ErrorBox } from '../components/Feedback'
import { Field } from '../components/Field'
import { Logo } from '../components/Layout'
import { Loading, Skeleton } from '../components/Skeleton'
import { errorMessage } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (loading) return <LoginSkeleton />
  if (session) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) {
          setNotice('Almost there — check your inbox to confirm your email, then sign in.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  return (
    <div className="full-page-center">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <Logo />
          Project Status
        </div>
        <h1>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1>
        <p className="muted">Projects, daily stand-ups, sprints and payment timelines in one place.</p>

        {error && <ErrorBox>{error}</ErrorBox>}
        {notice && <div className="alert alert-success">{notice}</div>}

        <Field label="Email">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters.' : undefined}>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <p className="muted small center">
          {mode === 'signin' ? (
            <>
              No account yet?{' '}
              <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="full-page-center">
      <Loading className="card auth-card">
        <div className="brand brand-lg">
          <Logo />
          Project Status
        </div>
        <h1>
          <Skeleton w="40%" />
        </h1>
        <div>
          <div>
            <Skeleton w="95%" />
          </div>
          <div>
            <Skeleton w="55%" />
          </div>
        </div>
        {[44, 70].map((w) => (
          <div key={w} className="field">
            <span className="field-label">
              <Skeleton w={w} />
            </span>
            <Skeleton h={38} />
          </div>
        ))}
        <Skeleton h={36} />
        <p className="small center">
          <Skeleton w="50%" />
        </p>
      </Loading>
    </div>
  )
}
