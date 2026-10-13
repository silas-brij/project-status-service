import type { ReactNode } from 'react'
import { PAYMENT_STATUS, PROJECT_STATUS, SPRINT_STATUS, type EffectivePaymentStatus, type Tone } from '../lib/status'
import type { ProjectStatus, SprintStatus } from '../lib/types'

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS[status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const meta = SPRINT_STATUS[status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: EffectivePaymentStatus }) {
  const meta = PAYMENT_STATUS[status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
