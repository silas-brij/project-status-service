import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { Extension, type JSONContent } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'

/**
 * A formatted (WYSIWYG) editor for Markdown notes, like a chat composer: a toolbar,
 * the usual shortcuts, and Markdown typing shortcuts (`## `, `- `, `[ ] `, `**bold**`…).
 * It reads and writes Markdown, so saved notes stay plain Markdown.
 * Loaded on demand: see MarkdownEditor.
 */

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)
/** "Mod-Shift-8" → "Ctrl+Shift+8", or "⌘⇧8" on a Mac. */
function keys(combo: string) {
  if (isMac) return combo.replace('Mod-', '⌘').replace('Shift-', '⇧').replace('Alt-', '⌥')
  return combo.replace('Mod-', 'Ctrl+').replace('Shift-', 'Shift+').replace('Alt-', 'Alt+')
}

interface SerializerInternals {
  codeTypes: Set<string>
  escapeMarkdownSyntax: (text: string) => string
  encodeTextForMarkdown: (text: string, node: { marks?: (string | { type: string })[] }, parent?: { type?: string } | null) => string
}

/**
 * Escapes only what would change meaning when the Markdown is read back, so "R&D" and
 * "a < b" are saved as typed rather than as "R&amp;D" and "a &lt; b".
 */
function escapeHtml(text: string) {
  return text
    .replace(/&(?=#?\w+;)/g, '&amp;') // would read as an entity, like &copy;
    .replace(/<(?=[a-zA-Z/!?])/g, '&lt;') // would start a tag or an autolink
    .replace(/^>/, '&gt;') // would start a quote
}

const EMPTY_BULLET = /^\s*[-*+]\s*$/
const EMPTY_TASK = /^\s*[-*+]\s+\[([ xX])\]\s*$/

/**
 * An empty list item, like the "- " lines of the note templates, is read as a paragraph
 * containing "- ". Turn it back into an empty item, ready to type in.
 */
function restoreEmptyListItems(node: JSONContent): JSONContent {
  if (!node.content) return node
  const content = node.content.map((child): JSONContent => {
    const only = child.type === 'paragraph' && child.content?.length === 1 ? child.content[0] : null
    const text = only?.type === 'text' && !only.marks?.length ? (only.text ?? '') : null
    if (text != null) {
      const task = text.match(EMPTY_TASK)
      if (task) return { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: task[1] !== ' ' }, content: [{ type: 'paragraph' }] }] }
      if (EMPTY_BULLET.test(text)) return { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }
    }
    return restoreEmptyListItems(child)
  })
  return { ...node, content }
}

const NotesMarkdown = Markdown.extend({
  onBeforeCreate(event) {
    // The default reads the initial Markdown in here, before it can be adjusted, so read it again below.
    const initial = this.editor.options.content
    this.parent?.(event)
    const manager = this.storage.manager
    const parse = manager.parse.bind(manager)
    manager.parse = (markdown) => restoreEmptyListItems(parse(markdown))
    if (typeof initial === 'string') this.editor.options.content = manager.parse(initial)

    // The serializer's text escaping isn't configurable. If its internals ever change, keep the default.
    const m = manager as unknown as Partial<SerializerInternals>
    if (!(m.codeTypes instanceof Set) || typeof m.escapeMarkdownSyntax !== 'function' || typeof m.encodeTextForMarkdown !== 'function') return
    const codeTypes = m.codeTypes
    const escapeSyntax = m.escapeMarkdownSyntax.bind(m)
    m.encodeTextForMarkdown = (text, node, parent) => {
      const inCode =
        (parent?.type != null && codeTypes.has(parent.type)) ||
        (node.marks ?? []).some((mark) => codeTypes.has(typeof mark === 'string' ? mark : mark.type))
      return inCode ? text : escapeSyntax(escapeHtml(text))
    }
  },
})

/** Save and link shortcuts. Runs before the defaults, so Ctrl+Enter saves instead of inserting a line break. */
const NotesShortcuts = Extension.create<{ onSubmit: () => boolean; onLink: () => boolean }>({
  name: 'notesShortcuts',
  priority: 1000,
  addOptions() {
    return { onSubmit: () => false, onLink: () => false }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.options.onSubmit(),
      'Mod-s': () => this.options.onSubmit(),
      'Mod-k': () => this.options.onLink(),
    }
  },
})

const MARKDOWN_HINT = /^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|>|```|\|.*\|\s*$)|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)|`[^`\n]+`/m
/** HTML that carries formatting (from a web page or a document), not just colours from a code editor. */
const FORMATTED_HTML = /<(p|h[1-6]|ul|ol|li|a|b|strong|em|i|table|blockquote|pre)[\s>]/i

// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  autoFocus?: boolean
  rows: number
  onSubmitShortcut?: () => void
  /** Shown at the end of the toolbar. */
  trailing?: ReactNode
}

export default function RichTextEditor({ value, onChange, label, placeholder, autoFocus, rows, onSubmitShortcut, trailing }: RichTextEditorProps) {
  const [linking, setLinking] = useState(false)
  // The editor is created once; these refs let it call the latest props.
  const latest = useRef({ onChange, onSubmitShortcut })
  latest.current = { onChange, onSubmitShortcut }
  const lastValue = useRef(value)
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Markdown has no underline.
        underline: false,
        // It adds an empty paragraph on the first click, which would count as an unsaved change.
        trailingNode: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Write something…' }),
      NotesMarkdown,
      NotesShortcuts.configure({
        onSubmit: () => {
          if (!latest.current.onSubmitShortcut) return false
          latest.current.onSubmitShortcut()
          return true
        },
        onLink: () => {
          setLinking(true)
          return true
        },
      }),
    ],
    content: value,
    contentType: 'markdown',
    autofocus: autoFocus ? 'end' : false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: 'markdown rte-content', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label },
      // Markdown pasted as plain text (from a .md file, a code editor or a chat) keeps its formatting.
      handlePaste: (_view, event) => {
        const ed = editorRef.current
        const data = event.clipboardData
        if (!ed || !data || ed.isActive('codeBlock')) return false
        const text = data.getData('text/plain')
        const html = data.getData('text/html')
        if (!text || (html && FORMATTED_HTML.test(html)) || !MARKDOWN_HINT.test(text)) return false
        ed.commands.insertContent(text, { contentType: 'markdown' })
        return true
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown()
      lastValue.current = markdown
      latest.current.onChange(markdown)
    },
  })
  editorRef.current = editor

  // Content replaced from outside (a loaded file, "Convert to Markdown"…).
  useEffect(() => {
    if (!editor || value === lastValue.current) return
    lastValue.current = value
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
  }, [editor, value])

  return (
    <div className="rte" style={{ '--rows': rows } as CSSProperties}>
      <Toolbar editor={editor} onLink={() => setLinking(true)} trailing={trailing} />
      {linking && <LinkBar editor={editor} onClose={() => setLinking(false)} />}
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------------------------------------------------------------------------

interface Tool {
  name: string
  label: string
  shortcut?: string
  icon: ReactNode
  isActive: (e: Editor) => boolean
  run: (e: Editor) => void
}

const svg = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
)

const GROUPS: Tool[][] = [
  [
    {
      name: 'heading',
      label: 'Heading',
      shortcut: 'Mod-Alt-2',
      icon: <span className="rte-glyph">H</span>,
      isActive: (e) => e.isActive('heading'),
      run: (e) => (e.isActive('heading') ? e.chain().focus().setParagraph().run() : e.chain().focus().setHeading({ level: 2 }).run()),
    },
    {
      name: 'bold',
      label: 'Bold',
      shortcut: 'Mod-B',
      icon: <b className="rte-glyph">B</b>,
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      name: 'italic',
      label: 'Italic',
      shortcut: 'Mod-I',
      icon: <i className="rte-glyph rte-glyph-italic">I</i>,
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      name: 'strike',
      label: 'Strikethrough',
      shortcut: 'Mod-Shift-S',
      icon: <s className="rte-glyph">S</s>,
      isActive: (e) => e.isActive('strike'),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      name: 'code',
      label: 'Code',
      shortcut: 'Mod-E',
      icon: svg(
        <>
          <path d="m16 18 6-6-6-6" />
          <path d="m8 6-6 6 6 6" />
        </>,
      ),
      isActive: (e) => e.isActive('code'),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      name: 'bulletList',
      label: 'Bulleted list',
      shortcut: 'Mod-Shift-8',
      icon: svg(
        <>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" fill="currentColor" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" />
          <circle cx="4.5" cy="18" r="1" fill="currentColor" />
        </>,
      ),
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      name: 'orderedList',
      label: 'Numbered list',
      shortcut: 'Mod-Shift-7',
      icon: svg(
        <>
          <path d="M10 6h10M10 12h10M10 18h10" />
          <path d="M4 4.5h1.2V9" strokeWidth="1.6" />
          <path d="M3.6 14.6c.3-.6.9-.9 1.5-.8.8.1 1.2.8.9 1.5L3.6 19h2.7" strokeWidth="1.6" />
        </>,
      ),
      isActive: (e) => e.isActive('orderedList'),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      name: 'taskList',
      label: 'Checklist',
      shortcut: 'Mod-Shift-9',
      icon: svg(
        <>
          <rect x="3" y="4" width="6" height="6" rx="1.5" />
          <path d="m4.6 7 1.1 1.1L7.6 6" strokeWidth="1.6" />
          <rect x="3" y="14" width="6" height="6" rx="1.5" />
          <path d="M13 7h8M13 17h8" />
        </>,
      ),
      isActive: (e) => e.isActive('taskList'),
      run: (e) => e.chain().focus().toggleTaskList().run(),
    },
  ],
  [
    {
      name: 'link',
      label: 'Link',
      shortcut: 'Mod-K',
      icon: svg(
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>,
      ),
      isActive: (e) => e.isActive('link'),
      run: () => {}, // Opens the link bar; see Toolbar.
    },
    {
      name: 'blockquote',
      label: 'Quote',
      shortcut: 'Mod-Shift-B',
      icon: svg(
        <>
          <path d="M4 5v14" />
          <path d="M9 8h11M9 12h11M9 16h7" />
        </>,
      ),
      isActive: (e) => e.isActive('blockquote'),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      name: 'codeBlock',
      label: 'Code block',
      shortcut: 'Mod-Alt-C',
      icon: svg(
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="m10 9.5-2.5 2.5 2.5 2.5M14 9.5l2.5 2.5-2.5 2.5" />
        </>,
      ),
      isActive: (e) => e.isActive('codeBlock'),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
  ],
]

function Toolbar({ editor, onLink, trailing }: { editor: Editor; onLink: () => void; trailing?: ReactNode }) {
  // Formatting at the cursor, shown only while writing in the editor.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => Object.fromEntries(GROUPS.flat().map((t) => [t.name, e.isFocused && t.isActive(e)])),
  })

  return (
    <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
      {GROUPS.map((group, i) => (
        <div key={i} className="rte-group">
          {group.map((tool) => (
            <button
              key={tool.name}
              type="button"
              className="rte-btn"
              aria-label={tool.label}
              aria-pressed={active[tool.name]}
              title={tool.shortcut ? `${tool.label} (${keys(tool.shortcut)})` : tool.label}
              // Keep the editor's selection while clicking.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (tool.name === 'link' ? onLink() : tool.run(editor))}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      ))}
      {trailing}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** "example.com" → "https://example.com", "ana@example.com" → "mailto:ana@example.com". */
function toHref(input: string) {
  const url = input.trim()
  if (!url) return ''
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`
  return `https://${url}`
}

function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = (editor.getAttributes('link').href as string | undefined) ?? ''
  const [url, setUrl] = useState(current)

  function close() {
    onClose()
    editor.commands.focus()
  }

  function apply() {
    const href = toHref(url)
    if (!href) return remove()
    const { empty } = editor.state.selection
    if (empty && !editor.isActive('link')) {
      // Nothing selected: insert the address itself as the link text, then type on without the link.
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: url.trim(), marks: [{ type: 'link', attrs: { href } }] })
        .unsetMark('link')
        .run()
    } else {
      // Then carry on typing after the link, in plain text, like a chat composer.
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href })
        .command(({ tr }) => {
          tr.setSelection(TextSelection.create(tr.doc, tr.selection.to))
          return true
        })
        .unsetMark('link')
        .run()
    }
    onClose()
  }

  function remove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    onClose()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      // Not the surrounding form's submit.
      e.preventDefault()
      apply()
    } else if (e.key === 'Escape') {
      // Only the link bar closes, not the dialog around the editor.
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  return (
    <div className="rte-link">
      <input
        autoFocus
        type="text"
        inputMode="url"
        aria-label="Link address"
        placeholder="Paste or type a link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="button" className="btn btn-sm btn-primary" onClick={apply}>
        {current ? 'Update' : 'Add link'}
      </button>
      {current && (
        <button type="button" className="btn btn-sm" onClick={remove}>
          Remove
        </button>
      )}
      <button type="button" className="icon-btn" aria-label="Cancel" onClick={close}>
        ×
      </button>
    </div>
  )
}
