import { useState, type KeyboardEvent } from 'react'
import { cx } from '../lib/format'
import { Markdown } from './Markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
  autoFocus?: boolean
  /** Called on Ctrl/⌘ + Enter or Ctrl/⌘ + S. */
  onSubmitShortcut?: () => void
}

export function MarkdownEditor({ value, onChange, rows = 10, placeholder, autoFocus, onSubmitShortcut }: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!onSubmitShortcut || !(e.ctrlKey || e.metaKey)) return
    if (e.key === 'Enter' || e.key.toLowerCase() === 's') {
      e.preventDefault()
      onSubmitShortcut()
    }
  }

  return (
    <div className="md-editor">
      <div className="md-editor-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'write'} className={cx(tab === 'write' && 'active')} onClick={() => setTab('write')}>
          Write
        </button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} className={cx(tab === 'preview' && 'active')} onClick={() => setTab('preview')}>
          Preview
        </button>
        <span className="md-editor-hint">Markdown supported</span>
      </div>
      {tab === 'write' ? (
        <textarea
          className="md-editor-input"
          value={value}
          rows={rows}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck
        />
      ) : (
        <div className="md-editor-preview">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="muted">Nothing to preview.</p>}
        </div>
      )}
    </div>
  )
}
