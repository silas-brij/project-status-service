import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from './format'

export interface AsyncState<T> {
  data: T | undefined
  error: string | null
  loading: boolean
  /** Re-runs the loader, keeping the current data visible while it loads. */
  reload: () => void
  /** Replaces the data locally, e.g. with the row a save returned. */
  mutate: (data: T) => void
}

interface Snapshot<T> {
  key: string
  data: T | undefined
  error: string | null
  loading: boolean
}

/**
 * Minimal data-loading hook. `deps` must be JSON-serialisable (ids, dates…);
 * when they change, stale data from the previous deps is never returned.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const key = JSON.stringify(deps)
  const [tick, setTick] = useState(0)
  const [snap, setSnap] = useState<Snapshot<T>>({ key, data: undefined, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setSnap((s) => ({ ...s, loading: true, error: null }))
    load().then(
      (data) => {
        if (!cancelled) setSnap({ key, data, error: null, loading: false })
      },
      (err) => {
        if (!cancelled) {
          setSnap((s) => ({ key, data: s.key === key ? s.data : undefined, error: errorMessage(err), loading: false }))
        }
      },
    )
    return () => {
      cancelled = true
    }
    // `load` is intentionally not a dependency: `deps` describes what it loads.
  }, [key, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const mutate = useCallback((data: T) => setSnap({ key, data, error: null, loading: false }), [key])

  const fresh = snap.key === key
  return {
    data: fresh ? snap.data : undefined,
    error: fresh ? snap.error : null,
    loading: !fresh || snap.loading,
    reload,
    mutate,
  }
}
