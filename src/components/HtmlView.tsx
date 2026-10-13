import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { cx } from '../lib/format'
import { sanitizeHtml } from '../lib/sanitizeHtml'

/** What a shown document may load: images, styles and fonts. Never scripts, frames or forms. */
const CSP =
  "default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; font-src https: data:; media-src https: data:; base-uri 'none'; form-action 'none'"

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const subscribeToScheme = (onChange: () => void) => {
  darkQuery.addEventListener('change', onChange)
  return () => darkQuery.removeEventListener('change', onChange)
}

/** A starting look for unstyled HTML, taken from the app's theme. The document's own CSS wins. */
function baseCss(dark: boolean) {
  const theme = getComputedStyle(document.documentElement)
  const v = (name: string) => theme.getPropertyValue(name).trim()
  return `:root{color-scheme:${dark ? 'dark' : 'light'}}
html{background:transparent}
body{margin:0;font:14px/1.6 ${v('--font')};color:${v('--text')};overflow-wrap:anywhere}
body>:first-child{margin-top:0}
body>:last-child{margin-bottom:0}
a[href]{color:${v('--primary')}}
img,video{max-width:100%;height:auto}
table{border-collapse:collapse}
th,td{border:1px solid ${v('--border')};padding:4px 8px;text-align:left;vertical-align:top}
pre{overflow-x:auto}`
}

function buildDocument(html: string, dark: boolean) {
  const doc = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html')
  const csp = doc.createElement('meta')
  csp.httpEquiv = 'Content-Security-Policy'
  csp.content = CSP
  const style = doc.createElement('style')
  style.textContent = baseCss(dark)
  doc.head.prepend(csp, style)
  return `<!doctype html>${doc.documentElement.outerHTML}`
}

/**
 * Shows an HTML document as designed, isolated from the app: its styles can't affect the
 * page, and nothing in it can run (the frame has scripts disabled and a strict content policy).
 * The frame grows to fit the document.
 */
export function HtmlView({ html, title = 'Notes', className }: { html: string; title?: string; className?: string }) {
  const dark = useSyncExternalStore(subscribeToScheme, () => darkQuery.matches)
  const srcDoc = useMemo(() => buildDocument(html, dark), [html, dark])
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number>()

  useEffect(() => {
    const iframe = frame.current
    if (!iframe) return
    const measure = () => {
      const doc = iframe.contentDocument
      if (!doc?.body) return
      setHeight(Math.ceil(Math.max(doc.documentElement.getBoundingClientRect().height, doc.body.scrollHeight)))
    }
    // The document is static, so its height only changes when it loads or the frame's width changes.
    iframe.addEventListener('load', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(iframe)
    return () => {
      iframe.removeEventListener('load', measure)
      observer.disconnect()
    }
  }, [])

  return (
    <iframe
      ref={frame}
      className={cx('html-view', className)}
      title={title}
      // Same origin lets the app measure the document's height. Without `allow-scripts` nothing in it runs.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      style={height ? { height } : undefined}
    />
  )
}
