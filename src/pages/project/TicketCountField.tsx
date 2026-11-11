import { useState } from 'react'
import { Skeleton } from '../../components/Skeleton'
import * as api from '../../lib/api'
import { errorMessage } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'

/**
 * The number of tickets a project completed on a day. Saves when the field loses
 * focus or on Enter. Emptying it removes the number, which is different from a 0.
 */
export function TicketCountField({ projectId, date }: { projectId: string; date: string }) {
  const stored = useAsync(() => api.getTicketCount(projectId, date), [projectId, date])
  /** `null` = showing the stored number. */
  const [text, setText] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (stored.error) return <div className="small text-red">Couldn't load the ticket count: {stored.error}</div>

  const current = stored.data?.completed ?? null

  async function commit() {
    if (text === null) return
    const next = text === '' ? null : Number(text)
    if (next === current) return setText(null)

    setState('saving')
    setError(null)
    try {
      if (next !== null) {
        stored.mutate(await api.saveTicketCount(projectId, date, next))
      } else if (stored.data) {
        await api.deleteTicketCount(stored.data.id)
        stored.mutate(null)
      }
      // Something typed while saving stays in the field.
      setText((typed) => (typed === text ? null : typed))
      setState('saved')
    } catch (err) {
      setError(errorMessage(err))
      setState('idle')
    }
  }

  return (
    <div className="ticket-count">
      <label className="ticket-count-label">
        <span className="field-label">Tickets completed</span>
        {stored.loading ? (
          <Skeleton w={72} h={32} />
        ) : (
          <input
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder="—"
            value={text ?? current ?? ''}
            onChange={(e) => {
              setText(e.target.value.replace(/\D/g, ''))
              setState('idle')
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
        )}
      </label>
      <span role="status" className={error ? 'small text-red' : state === 'saved' ? 'small text-green' : 'small muted'}>
        {error ?? (state === 'saving' ? 'Saving…' : state === 'saved' ? '✓ Saved' : '')}
      </span>
    </div>
  )
}
