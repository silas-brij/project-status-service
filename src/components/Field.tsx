import type { ReactNode } from 'react'
import { cx } from '../lib/format'

interface FieldProps {
  label: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, hint, className, children }: FieldProps) {
  return (
    <label className={cx('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
