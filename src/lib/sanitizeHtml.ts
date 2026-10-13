import DOMPurify from 'dompurify'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href')
    // Relative links point next to the original file, which isn't here.
    if (href && !/^(?:https?:|mailto:|tel:|#)/i.test(href)) node.removeAttribute('href')
    // Web and e-mail links open in a new tab, outside the app.
    else if (href && /^(?:https?:|mailto:)/i.test(href)) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }
  if (node.tagName === 'IMG') {
    // Only images on the web or embedded in the file can be shown; others show their description.
    if (!/^(?:https?:|data:image\/)/i.test(node.getAttribute('src') ?? '')) {
      const alt = node.getAttribute('alt')?.trim()
      node.replaceWith(node.ownerDocument.createTextNode(alt ? `[${alt}]` : ''))
    }
  }
})

/**
 * Makes an HTML document safe to show: removes scripts, event handlers, forms, embedded
 * frames and `javascript:` links, and keeps the content, styles and layout.
 */
export function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ['form', 'button', 'select', 'textarea', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'link', 'meta'],
  })
}
