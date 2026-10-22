import { lazy, Suspense, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { cx } from '../lib/format'
import type { NotesFormat } from '../lib/types'
import { NotesView } from './NotesView'
import { Loading, Skeleton } from './Skeleton'

// The formatted editor is large, so it loads the first time an editor is shown.
const RichTextEditor = lazy(() => import('./RichTextEditor'))

type Mode = 'rich' | 'markdown'
const MODE_KEY = 'notes-editor-mode'

/** Each person's choice of formatted editing or Markdown source, remembered in this browser. */
function savedMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'markdown' ? 'markdown' : 'rich'
  } catch {
    return 'rich'
  }
}

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  /** Accessible name of the editor, e.g. "Meeting notes". */
  label?: string
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
  label = 'Notes',
  format = 'markdown',
  onConvertToMarkdown,
  rows = 10,
  placeholder,
  autoFocus,
  onSubmitShortcut,
}: MarkdownEditorProps) {
  const [mode, setModeState] = useState<Mode>(savedMode)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const html = format === 'html'

  function setMode(next: Mode) {
    setModeState(next)
    setTab('write')
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // Not remembered, which is fine.
    }
  }

  if (!html && mode === 'rich') {
    return (
      <div className="md-editor">
        <Suspense fallback={<RichEditorSkeleton rows={rows} />}>
          <RichTextEditor
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
            autoFocus={autoFocus}
            rows={rows}
            onSubmitShortcut={onSubmitShortcut}
            trailing={
              <button type="button" className="rte-mode" onClick={() => setMode('markdown')} title="Edit the Markdown source">
                <MarkdownMark />
                Markdown
              </button>
            }
          />
        </Suspense>
      </div>
    )
  }

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
            <button type="button" className="rte-mode" onClick={() => setMode('rich')} title="Back to formatted editing with a toolbar">
              <FormatMark />
              Rich text
            </button>
          )}
        </span>
      </div>
      {tab === 'write' ? (
        <textarea
          className="md-editor-input"
          aria-label={label}
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

function RichEditorSkeleton({ rows }: { rows: number }) {
  return (
    <Loading label="Loading editor…">
      <div className="rte" style={{ '--rows': rows } as CSSProperties}>
        <div className="rte-toolbar">
          {[5, 3, 3].map((n, i) => (
            <div key={i} className="rte-group">
              {Array.from({ length: n }, (_, j) => (
                <Skeleton key={j} w={30} h={30} />
              ))}
            </div>
          ))}
        </div>
        <div className="rte-content">
          <Skeleton w="45%" />
          <br />
          <Skeleton w="70%" />
        </div>
      </div>
    </Loading>
  )
}

const MarkdownMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 15V9l3 3 3-3v6M17 9v6M15 13l2 2 2-2" />
  </svg>
)

const FormatMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7V5h16v2M9 19h6M12 5v14" />
  </svg>
)
