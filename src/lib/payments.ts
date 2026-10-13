import { todayISO } from './format'
import type { EffectivePaymentStatus } from './status'
import type { Payment } from './types'

export const isOpenPayment = (p: Pick<Payment, 'status'>) => p.status === 'pending' || p.status === 'invoiced'

export function paymentStatus(p: Pick<Payment, 'status' | 'due_date'>, today = todayISO()): EffectivePaymentStatus {
  return isOpenPayment(p) && p.due_date < today ? 'overdue' : p.status
}

export interface PaymentSummary {
  /** Everything scheduled, excluding cancelled payments. */
  total: number
  paid: number
  outstanding: number
  overdue: number
  overdueCount: number
  /** Earliest unpaid payment (may be overdue). */
  next: Payment | null
}

export function summarizePayments(payments: Payment[], today = todayISO()): PaymentSummary {
  const summary: PaymentSummary = { total: 0, paid: 0, outstanding: 0, overdue: 0, overdueCount: 0, next: null }
  for (const p of payments) {
    if (p.status === 'cancelled') continue
    const amount = Number(p.amount)
    summary.total += amount
    if (p.status === 'paid') {
      summary.paid += amount
      continue
    }
    summary.outstanding += amount
    if (p.due_date < today) {
      summary.overdue += amount
      summary.overdueCount += 1
    }
    if (!summary.next || p.due_date < summary.next.due_date) summary.next = p
  }
  return summary
}
