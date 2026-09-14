/**
 * HTML Sanitizer for Custom HTML blocks in Landing Pages and Rich Content
 * Implements strict allow-list security per GoodZeed PRD Phase 6 §4 & Phase 7 §4
 * Disallows: <script>, inline event handlers (onload, onclick), javascript: URIs, arbitrary iframes, unsafe styles.
 */

const ALLOWED_TAGS = new Set([
  'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'b', 'i', 'em', 'strong',
  'br', 'hr', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption', 'section'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel', 'class', 'id']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'id']),
  '*': new Set(['class', 'id', 'aria-hidden', 'aria-label'])
};

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    function cleanNode(node: Node): Node | null {
      if (node.nodeType === Node.TEXT_NODE) {
        return node;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // Disallow dangerous or unapproved tags
        if (!ALLOWED_TAGS.has(tagName)) {
          // If it's a script or style or iframe, discard completely
          if (['script', 'style', 'iframe', 'object', 'embed', 'link'].includes(tagName)) {
            return null;
          }
          // For other unknown tags, retain text children
          const frag = document.createDocumentFragment();
          Array.from(el.childNodes).forEach(child => {
            const cleanChild = cleanNode(child);
            if (cleanChild) frag.appendChild(cleanChild);
          });
          return frag;
        }

        // Clean attributes
        const newEl = document.createElement(tagName);
        const tagAllowedAttrs = ALLOWED_ATTRIBUTES[tagName] || new Set();
        const globalAllowedAttrs = ALLOWED_ATTRIBUTES['*'];

        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          const attrName = attr.name.toLowerCase();
          const attrValue = attr.value;

          // Block all event handlers (onclick, onload, etc.)
          if (attrName.startsWith('on')) {
            continue;
          }

          // Check allow-list
          if (tagAllowedAttrs.has(attrName) || globalAllowedAttrs.has(attrName)) {
            // Block javascript: or data: URIs in href and src
            if ((attrName === 'href' || attrName === 'src')) {
              const trimmed = attrValue.trim().toLowerCase();
              if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html') || trimmed.startsWith('vbscript:')) {
                continue;
              }
            }

            // Safe external link defaults
            if (tagName === 'a' && attrName === 'target' && attrValue === '_blank') {
              newEl.setAttribute('rel', 'noopener noreferrer');
            }

            newEl.setAttribute(attrName, attrValue);
          }
        }

        // Recursively clean children
        Array.from(el.childNodes).forEach(child => {
          const cleanChild = cleanNode(child);
          if (cleanChild) newEl.appendChild(cleanChild);
        });

        return newEl;
      }

      return null;
    }

    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(child => {
      const cleaned = cleanNode(child);
      if (cleaned) fragment.appendChild(cleaned);
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment);
    return wrapper.innerHTML;
  } catch (err) {
    console.error('Sanitization error:', err);
    return '';
  }
}
