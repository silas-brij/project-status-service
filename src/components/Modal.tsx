import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/format'

interface ModalProps {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}

/** Dialog shell. Put a `.modal-body` and `.modal-footer` inside (usually in a <form>). */
export function Modal({ title, onClose, wide, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop">
      <div className={cx('modal', wide && 'modal-wide')} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  )
}
