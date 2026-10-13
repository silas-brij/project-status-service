import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface FullViewProps {
  /** Accessible name, e.g. "Stand-up, October 13, 2026". */
  label: string
  /** Left side of the bar, e.g. the project name. */
  context: ReactNode
  /** What prev/next step through, e.g. "stand-up". */
  itemName: string
  /** Project color for dots, chips and progress bars inside the view. */
  accent?: string
  /** Buttons shown between prev/next and "Exit full view". */
  actions?: ReactNode
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  children: ReactNode
}

function isFormField(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

/**
 * A distraction-free reading view over the whole window.
 * Esc closes it; ← / → step to the previous / next item.
 */
export function FullView({ label, context, itemName, accent, actions, onClose, onPrev, onNext, children }: FullViewProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A dialog opened on top (e.g. the edit form) handles its own keys.
      if (document.querySelector('.modal-backdrop')) return
      if (e.key === 'Escape') return onClose()
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isFormField(e.target)) return
      if (e.key === 'ArrowLeft' && onPrev) {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight' && onNext) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  // Lock the page behind, move focus in (so keyboard scrolling works), and give it back on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  return createPortal(
    <div
      ref={root}
      className="fullview"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      style={accent ? ({ '--project-color': accent } as CSSProperties) : undefined}
    >
      <div className="fullview-bar">
        <div className="fullview-context">{context}</div>
        <div className="fullview-actions">
          <div className="btn-group">
            <button type="button" className="btn btn-sm" disabled={!onPrev} onClick={onPrev} title={`Previous ${itemName} (←)`}>
              ‹ Prev
            </button>
            <button type="button" className="btn btn-sm" disabled={!onNext} onClick={onNext} title={`Next ${itemName} (→)`}>
              Next ›
            </button>
          </div>
          {actions}
          <button type="button" className="btn btn-sm" onClick={onClose} title="Esc">
            Exit full view
          </button>
        </div>
      </div>
      <div className="fullview-body">{children}</div>
    </div>,
    document.body,
  )
}
