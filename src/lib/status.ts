import type { PaymentStatus, ProjectStatus, SprintStatus } from './types'

export type Tone = 'gray' | 'green' | 'amber' | 'blue' | 'red'

interface StatusMeta {
  label: string
  tone: Tone
}

export const PROJECT_STATUS: Record<ProjectStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'green' },
  on_hold: { label: 'On hold', tone: 'amber' },
  completed: { label: 'Completed', tone: 'blue' },
  archived: { label: 'Archived', tone: 'gray' },
}

export const SPRINT_STATUS: Record<SprintStatus, StatusMeta> = {
  planned: { label: 'Planned', tone: 'gray' },
  active: { label: 'Active', tone: 'green' },
  completed: { label: 'Completed', tone: 'blue' },
}

/** Stored payment status plus the derived "overdue" state. */
export type EffectivePaymentStatus = PaymentStatus | 'overdue'

export const PAYMENT_STATUS: Record<EffectivePaymentStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'gray' },
  invoiced: { label: 'Invoiced', tone: 'blue' },
  paid: { label: 'Paid', tone: 'green' },
  overdue: { label: 'Overdue', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
}

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS) as ProjectStatus[]
export const SPRINT_STATUSES = Object.keys(SPRINT_STATUS) as SprintStatus[]
export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'invoiced', 'paid', 'cancelled']
