import { Logo } from './Layout'

/** Shown when the Supabase environment variables are missing. */
export function SetupNotice() {
  return (
    <div className="full-page-center">
      <div className="card auth-card">
        <div className="brand brand-lg">
          <Logo />
          Project Status
        </div>
        <h1>Connect Supabase</h1>
        <p className="muted">
          The app needs two environment variables. Locally, copy <code>.env.example</code> to <code>.env.local</code>; on your host, add
          them in the project's environment settings and redeploy.
        </p>
        <pre className="code-block">
          VITE_SUPABASE_URL=https://your-project-ref.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
        </pre>
        <p className="muted small">Find both in the Supabase dashboard under Project Settings → API.</p>
      </div>
    </div>
  )
}
