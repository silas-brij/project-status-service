import { useState, type KeyboardEvent } from 'react'
import { cx } from '../lib/format'
import type { NotesFormat } from '../lib/types'
import { NotesView } from './NotesView'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  /** Notes can also be an HTML document: edited as source, previewed as designed. */
  format?: NotesFormat
  /** Offered for HTML: turns the document into editable Markdown. */
  onConvertToMarkdown?: () => void
  rows?: number
  placeholder?: string
  autoFocus?: boolean
  /** Called on Ctrl/⌘ + Enter or Ctrl/⌘ + S. */
  onSubmitShortcut?: () => void
}

export function MarkdownEditor({
  value,
  onChange,
  format = 'markdown',
  onConvertToMarkdown,
  rows = 10,
  placeholder,
  autoFocus,
  onSubmitShortcut,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const html = format === 'html'

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
          {html ? 'HTML' : 'Write'}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} className={cx(tab === 'preview' && 'active')} onClick={() => setTab('preview')}>
          Preview
        </button>
        <span className="md-editor-hint">
          {html ? (
            <>
              Shown as designed
              {onConvertToMarkdown && (
                <>
                  {' · '}
                  <button type="button" className="link-btn" onClick={onConvertToMarkdown}>
                    Convert to Markdown
                  </button>
                </>
              )}
            </>
          ) : (
            'Markdown supported'
          )}
        </span>
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
          spellCheck={!html}
        />
      ) : (
        <div className="md-editor-preview">
          {value.trim() ? <NotesView content={value} format={format} /> : <p className="muted">Nothing to preview.</p>}
        </div>
      )}
    </div>
  )
}
