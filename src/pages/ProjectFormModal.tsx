import { useState, type FormEvent } from 'react'
import { ErrorBox } from '../components/Feedback'
import { Field } from '../components/Field'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { Modal } from '../components/Modal'
import * as api from '../lib/api'
import { errorMessage } from '../lib/format'
import { PROJECT_STATUS, PROJECT_STATUSES } from '../lib/status'
import type { Project, ProjectStatus } from '../lib/types'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'INR', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'BRL', 'MXN', 'UAH', 'PLN']

interface ProjectFormModalProps {
  project?: Project
  onClose: () => void
  onSaved: (project: Project) => void
  onDeleted?: () => void
}

export function ProjectFormModal({ project, onClose, onSaved, onDeleted }: ProjectFormModalProps) {
  const [form, setForm] = useState({
    name: project?.name ?? '',
    client: project?.client ?? '',
    description: project?.description ?? '',
    status: project?.status ?? ('active' as ProjectStatus),
    color: project?.color ?? COLORS[0],
    currency: project?.currency ?? 'USD',
    budget: project?.budget != null ? String(project.budget) : '',
    start_date: project?.start_date ?? '',
    end_date: project?.end_date ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const currency = form.currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) return setError('Currency must be a 3-letter code such as USD or EUR.')
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      return setError('The end date must be on or after the start date.')
    }
    setBusy(true)
    setError(null)
    try {
      const input = {
        name: form.name.trim(),
        client: form.client.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        color: form.color,
        currency,
        budget: form.budget === '' ? null : Number(form.budget),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }
      onSaved(project ? await api.updateProject(project.id, input) : await api.createProject(input))
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function remove() {
    if (!project || !onDeleted) return
    const ok = window.confirm(
      `Delete "${project.name}"?\n\nAll of its stand-ups, sprints and payments will be deleted too. This cannot be undone.`,
    )
    if (!ok) return
    setBusy(true)
    try {
      await api.deleteProject(project.id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="modal-body">
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="form-grid">
            <Field label="Project name" className="span-2">
              <input required autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Acme mobile app" />
            </Field>
            <Field label="Client">
              <input value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date">
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </Field>
            <Field label="Currency">
              <input list="currency-options" value={form.currency} maxLength={3} onChange={(e) => set('currency', e.target.value)} />
              <datalist id="currency-options">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Budget" hint="Optional — total contract value.">
              <input type="number" min="0" step="0.01" value={form.budget} onChange={(e) => set('budget', e.target.value)} />
            </Field>
            <div className="field span-2">
              <span className="field-label">Color</span>
              <div className="swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="swatch"
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                    aria-pressed={form.color === c}
                    onClick={() => set('color', c)}
                  />
                ))}
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} aria-label="Custom color" />
              </div>
            </div>
            <div className="field span-2">
              <span className="field-label">Description</span>
              <MarkdownEditor label="Description" value={form.description} onChange={(v) => set('description', v)} rows={6} placeholder="Scope, links, contacts…" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {project && onDeleted && (
            <button type="button" className="btn btn-danger-ghost" onClick={remove} disabled={busy}>
              Delete project
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
