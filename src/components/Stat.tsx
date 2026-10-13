import type { ReactNode } from 'react'
import { cx } from '../lib/format'
import type { Tone } from '../lib/status'

interface StatProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: Tone
}

export function Stat({ label, value, hint, tone }: StatProps) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className={cx('stat-value', tone && `text-${tone}`)}>{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}
