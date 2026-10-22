import type { PaymentStatus, ProjectStatus, SprintStatus } from './types'

export type Tone = 'gray' | 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal'

interface StatusMeta {
  label: string
  tone: Tone
}

/** In lifecycle order, which is also the order of the status pickers. */
export const PROJECT_STATUS: Record<ProjectStatus, StatusMeta> = {
  proposal: { label: 'Proposal', tone: 'purple' },
  not_started: { label: 'Not started', tone: 'teal' },
  active: { label: 'Active', tone: 'green' },
  on_hold: { label: 'On hold', tone: 'amber' },
  completed: { label: 'Completed', tone: 'blue' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  archived: { label: 'Archived', tone: 'gray' },
}

/** Projects that aren't finished: the dashboard shows these by default. */
export const OPEN_PROJECT_STATUSES: ReadonlySet<ProjectStatus> = new Set(['proposal', 'not_started', 'active', 'on_hold'])

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
