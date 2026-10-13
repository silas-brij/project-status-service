import { Fragment, useState, type FormEvent } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { PaymentStatusBadge } from '../../components/Badges'
import { EmptyState, ErrorBox } from '../../components/Feedback'
import { Field } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { Loading } from '../../components/Skeleton'
import { Stat } from '../../components/Stat'
import * as api from '../../lib/api'
import { cx, errorMessage, formatDate, formatMoney, formatRelativeDay, plural, todayISO } from '../../lib/format'
import { isOpenPayment, paymentStatus, summarizePayments } from '../../lib/payments'
import { PAYMENT_STATUS, PAYMENT_STATUSES } from '../../lib/status'
import type { Payment, PaymentStatus, Project } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { PaymentsSummarySkeleton, PaymentTimelineSkeleton } from '../skeletons'
import { useProject } from './ProjectLayout'

export function PaymentsTab() {
  const { project } = useProject()
  const payments = useAsync(() => api.listPayments(project.id), [project.id])
  const [editing, setEditing] = useState<Payment | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = todayISO()
  const pending = payments.loading && !payments.data
  const list = payments.data ?? []
  const summary = summarizePayments(list, today)
  const money = (n: number) => formatMoney(n, project.currency)
  const todayIndex = list.findIndex((p) => p.due_date >= today)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      payments.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const markPaid = (p: Payment) => run(() => api.updatePayment(p.id, { status: 'paid', paid_date: today }))
  const remove = (p: Payment) => window.confirm(`Delete "${p.title}"?`) && run(() => api.deletePayment(p.id))

  const budget = project.budget != null && project.budget > 0 ? Number(project.budget) : null
  const scale = Math.max(budget ?? 0, summary.total) || 1

  return (
    <div className="stack">
      {pending ? (
        <PaymentsSummarySkeleton />
      ) : (
        <>
          <div className="stats">
            <Stat label="Scheduled" value={money(summary.total)} hint={budget != null ? `Budget ${money(budget)}` : `${plural(list.length, 'payment')}`} />
            <Stat
              label="Received"
              value={money(summary.paid)}
              tone="green"
              hint={summary.total ? `${Math.round((summary.paid / summary.total) * 100)}% of scheduled` : undefined}
            />
            <Stat label="Outstanding" value={money(summary.outstanding)} />
            <Stat
              label="Overdue"
              value={money(summary.overdue)}
              tone={summary.overdueCount ? 'red' : undefined}
              hint={summary.overdueCount ? plural(summary.overdueCount, 'payment') : 'Nothing overdue'}
            />
          </div>

          {summary.total > 0 && (
            <div className="card">
              <div className="budget-bar" aria-hidden="true">
                <div className="budget-paid" style={{ width: `${(summary.paid / scale) * 100}%` }} />
                <div className="budget-open" style={{ width: `${(summary.outstanding / scale) * 100}%` }} />
              </div>
              <div className="budget-legend small">
                <span>
                  <i className="legend-swatch budget-paid" /> Received {money(summary.paid)}
                </span>
                <span>
                  <i className="legend-swatch budget-open" /> Outstanding {money(summary.outstanding)}
                </span>
                {budget != null && (
                  <span className={cx(summary.total > budget && 'text-red')}>
                    {summary.total > budget
                      ? `Over budget by ${money(summary.total - budget)}`
                      : `Unscheduled budget ${money(budget - summary.total)}`}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="toolbar">
        <h2 className="toolbar-title">Payment timeline</h2>
        <div className="spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + Add payment
        </button>
      </div>

      {(error || payments.error) && <ErrorBox>{error ?? payments.error}</ErrorBox>}

      {pending ? (
        <Loading>
          <PaymentTimelineSkeleton />
        </Loading>
      ) : list.length === 0 ? (
        <EmptyState title="No payments yet">
          <p className="muted">Add deposits, milestones and invoices to see the project's payment timeline.</p>
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            Add the first payment
          </button>
        </EmptyState>
      ) : (
        <ol className="timeline">
          {list.map((p, i) => (
            <Fragment key={p.id}>
              {i === todayIndex && <TodayMarker today={today} />}
              <PaymentItem payment={p} project={project} today={today} onEdit={() => setEditing(p)} onMarkPaid={() => markPaid(p)} onDelete={() => remove(p)} />
            </Fragment>
          ))}
          {todayIndex === -1 && <TodayMarker today={today} />}
        </ol>
      )}

      {editing && (
        <PaymentFormModal
          projectId={project.id}
          currency={project.currency}
          payment={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            payments.reload()
          }}
        />
      )}
    </div>
  )
}

function TodayMarker({ today }: { today: string }) {
  return (
    <li className="timeline-today">
      <span>Today · {formatDate(today, 'MMM d')}</span>
    </li>
  )
}

interface PaymentItemProps {
  payment: Payment
  project: Project
  today: string
  onEdit: () => void
  onMarkPaid: () => void
  onDelete: () => void
}

function PaymentItem({ payment: p, project, today, onEdit, onMarkPaid, onDelete }: PaymentItemProps) {
  const status = paymentStatus(p, today)
  let when: string
  if (status === 'paid') when = p.paid_date ? `Paid ${formatDate(p.paid_date)}` : 'Paid'
  else if (status === 'cancelled') when = 'Cancelled'
  else if (status === 'overdue') when = `${plural(differenceInCalendarDays(parseISO(today), parseISO(p.due_date)), 'day')} overdue`
  else when = `Due ${formatRelativeDay(p.due_date, today)}`

  return (
    <li className={cx('timeline-item', `is-${status}`)}>
      <span className="timeline-dot" aria-hidden="true" />
      <div className="timeline-date">
        <strong>{formatDate(p.due_date, 'MMM d')}</strong>
        <span>{formatDate(p.due_date, 'yyyy')}</span>
      </div>
      <div className="card timeline-card">
        <div className="timeline-card-main">
          <div className="min-w-0">
            <div className="timeline-title">{p.title}</div>
            <div className="muted small">{when}</div>
          </div>
          <div className="timeline-amount">{formatMoney(p.amount, project.currency)}</div>
        </div>
        {p.notes && <p className="timeline-notes">{p.notes}</p>}
        <div className="timeline-card-actions">
          <PaymentStatusBadge status={status} />
          <div className="spacer" />
          {isOpenPayment(p) && (
            <button type="button" className="btn btn-sm" onClick={onMarkPaid}>
              ✓ Mark paid
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn btn-sm btn-danger-ghost" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------

interface PaymentFormModalProps {
  projectId: string
  currency: string
  payment?: Payment
  onClose: () => void
  onSaved: () => void
}

function PaymentFormModal({ projectId, currency, payment, onClose, onSaved }: PaymentFormModalProps) {
  const [form, setForm] = useState({
    title: payment?.title ?? '',
    amount: payment ? String(payment.amount) : '',
    due_date: payment?.due_date ?? todayISO(),
    status: payment?.status ?? ('pending' as PaymentStatus),
    paid_date: payment?.paid_date ?? '',
    notes: payment?.notes ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const paid = form.status === 'paid'
      const input = {
        title: form.title.trim(),
        amount: Number(form.amount),
        due_date: form.due_date,
        status: form.status,
        paid_date: paid ? form.paid_date || todayISO() : null,
        notes: form.notes.trim() || null,
      }
      if (payment) await api.updatePayment(payment.id, input)
      else await api.createPayment(projectId, input)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={payment ? 'Edit payment' : 'Add payment'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="form-grid">
            <Field label="Title" className="span-2">
              <input required autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Deposit, Milestone 2, Final invoice" />
            </Field>
            <Field label={`Amount (${currency})`}>
              <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
            </Field>
            <Field label="Due date">
              <input type="date" required value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => {
                  const status = e.target.value as PaymentStatus
                  setForm((f) => ({ ...f, status, paid_date: status === 'paid' && !f.paid_date ? todayISO() : f.paid_date }))
                }}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS[s].label}
                  </option>
                ))}
              </select>
            </Field>
            {form.status === 'paid' && (
              <Field label="Paid on">
                <input type="date" required value={form.paid_date} onChange={(e) => set('paid_date', e.target.value)} />
              </Field>
            )}
            <Field label="Notes" className="span-2">
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Invoice number, payment terms…" />
            </Field>
          </div>
        </div>
        <div className="modal-footer">
          <div className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : payment ? 'Save changes' : 'Add payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
