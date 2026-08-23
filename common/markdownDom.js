// AST <-> DOM bridge for the WYSIWYG-lite markdown editor. All DOM
// construction goes through document.createElement/createTextNode — never
// string-concatenated HTML — so there is no injection surface even when the
// source markdown contains things that look like tags (they land as literal
// text nodes, courtesy of parseMarkdown already treating raw HTML as text).
import { parseMarkdown } from './markdown'

const IMAGE_WRAPPER_ATTR = 'data-md-image'

// Builds the non-editable wrapper around an <img> preview. Exported so the
// editor panel can reuse the exact same node shape when inserting a photo
// picked mid-edit (keeps render and insert paths in sync).
export function createImageBlockNode(doc, url, caption) {
  const wrap = doc.createElement('div')
  wrap.setAttribute(IMAGE_WRAPPER_ATTR, '1')
  wrap.setAttribute('contenteditable', 'false')
  wrap.style.margin = '0.5em 0'
  const img = doc.createElement('img')
  img.setAttribute('src', url || '')
  if (caption) img.setAttribute('alt', caption)
  img.style.display = 'block'
  img.style.maxHeight = '120px'
  img.style.borderRadius = '8px'
  wrap.appendChild(img)
  return wrap
}

function appendInline(parent, node, doc) {
  switch (node.type) {
    case 'bold': {
      const strong = doc.createElement('strong')
      node.children.forEach((c) => appendInline(strong, c, doc))
      parent.appendChild(strong)
      break
    }
    case 'italic': {
      const em = doc.createElement('em')
      node.children.forEach((c) => appendInline(em, c, doc))
      parent.appendChild(em)
      break
    }
    case 'link': {
      const a = doc.createElement('a')
      a.setAttribute('href', node.url)
      // Deliberately not clickable while editing — this is an editor, not a
      // rendered page.
      a.setAttribute('data-md-link', '1')
      node.children.forEach((c) => appendInline(a, c, doc))
      parent.appendChild(a)
      break
    }
    case 'text':
    default:
      parent.appendChild(doc.createTextNode(node.value ?? ''))
      break
  }
}

function appendInlineChildren(parent, children, doc) {
  (children || []).forEach((c) => appendInline(parent, c, doc))
}

// renderMarkdownToElement(md, doc) -> HTMLElement
// Returns a container element whose children are the top-level blocks
// (p / h3 / blockquote / ul / image-wrapper div). Callers typically move
// those children into the real contentEditable host via replaceChildren.
export function renderMarkdownToElement(md, doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null)
  if (!d) throw new Error('renderMarkdownToElement requires a document')
  const container = d.createElement('div')
  const blocks = parseMarkdown(md)
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        // One visual heading size — the theme owns real sizes on the
        // published page. Level is intentionally not preserved; the
        // serializer always writes a single '# ' back out.
        const h = d.createElement('h3')
        appendInlineChildren(h, block.children, d)
        container.appendChild(h)
        break
      }
      case 'quote': {
        const bq = d.createElement('blockquote')
        appendInlineChildren(bq, block.children, d)
        container.appendChild(bq)
        break
      }
      case 'list': {
        const ul = d.createElement('ul')
        block.items.forEach((item) => {
          const li = d.createElement('li')
          appendInlineChildren(li, item, d)
          ul.appendChild(li)
        })
        container.appendChild(ul)
        break
      }
      case 'image':
        container.appendChild(createImageBlockNode(d, block.url, block.caption))
        break
      case 'paragraph':
      default: {
        const p = d.createElement('p')
        appendInlineChildren(p, block.children, d)
        container.appendChild(p)
        break
      }
    }
  }
  return container
}

function serializeInline(el) {
  let out = ''
  el.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += child.nodeValue
      return
    }
    if (child.nodeType !== 1) return
    const tag = child.tagName.toLowerCase()
    if (tag === 'br') { out += '\n'; return }
    if (tag === 'a') {
      out += `[${serializeInline(child)}](${child.getAttribute('href') || ''})`
      return
    }
    // Recurse into every other inline element so nested links/marks survive, and
    // detect emphasis from the tag OR inline styles. Pasted rich text (docs, web)
    // usually encodes bold/italic as <span style="font-weight:700"> /
    // font-style:italic rather than <b>/<i>, which used to flatten to plain text.
    const fw = String((child.style && child.style.fontWeight) || '')
    const fs = String((child.style && child.style.fontStyle) || '')
    const fwNum = parseInt(fw, 10)
    // Google Docs wraps pasted content in <b style="font-weight:normal">, so an
    // explicit normal/<600 weight must override the tag (else everything bolds).
    const explicitNormal = fw === 'normal' || (!Number.isNaN(fwNum) && fwNum < 600)
    const isBold = !explicitNormal && (tag === 'strong' || tag === 'b' || fw === 'bold' || fw === 'bolder' || (!Number.isNaN(fwNum) && fwNum >= 600))
    const isItalic = fs !== 'normal' && (tag === 'em' || tag === 'i' || fs === 'italic' || fs === 'oblique')
    let inner = serializeInline(child)
    if ((isBold || isItalic) && inner.trim() !== '') {
      // Keep any surrounding whitespace OUTSIDE the markers, else '** x **' won't parse.
      const lead = (inner.match(/^\s+/) || [''])[0]
      const trail = (inner.match(/\s+$/) || [''])[0]
      let core = inner.trim()
      if (isItalic) core = `*${core}*`
      if (isBold) core = `**${core}**`
      inner = lead + core + trail
    }
    out += inner
  })
  return out
}

function blockElementToMarkdown(el) {
  const tag = el.tagName.toLowerCase()
  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
    return `# ${serializeInline(el).trim()}`
  }
  if (tag === 'blockquote') {
    return `> ${serializeInline(el).trim()}`
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(el.children).filter((c) => c.tagName === 'LI')
    return items.map((li) => `- ${serializeInline(li).trim()}`).join('\n')
  }
  if (tag === 'img') {
    return `![](${el.getAttribute('src') || ''})`
  }
  if (el.hasAttribute(IMAGE_WRAPPER_ATTR)) {
    const img = el.querySelector('img')
    return `![](${img ? img.getAttribute('src') || '' : ''})`
  }
  // p, div, or anything else a browser's contentEditable might insert
  // (Enter often produces a fresh <div>) — treat as a paragraph.
  return serializeInline(el).trim()
}

// serializeDomToMarkdown(rootEl) -> string
// Walks the editable div's direct children back into markdown, one
// blank-line-separated block per top-level element.
const NESTED_BLOCK_RE = /^(p|div|section|article|header|footer|main|h[1-6]|blockquote|ul|ol|li|img|figure|pre)$/
const LEAF_BLOCK_RE = /^(h[1-6]|blockquote|ul|ol|img)$/

// Walk the tree collecting one markdown block per paragraph/heading/list/image.
// Pasted rich text is often nested (Google Docs wraps everything in a <b>; sites
// wrap paragraphs in <div>s), so recurse into any wrapper that holds block-level
// children instead of flattening it into a single line.
function collectBlocks(rootEl, blocks) {
  rootEl.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.nodeValue.trim()
      if (text) blocks.push(text)
      return
    }
    if (node.nodeType !== 1) return
    if (node.tagName === 'BR') return
    const tag = node.tagName.toLowerCase()
    const isLeaf = LEAF_BLOCK_RE.test(tag) || node.hasAttribute(IMAGE_WRAPPER_ATTR)
    if (!isLeaf && Array.from(node.children).some((c) => NESTED_BLOCK_RE.test(c.tagName.toLowerCase()))) {
      collectBlocks(node, blocks)
      return
    }
    const md = blockElementToMarkdown(node)
    if (md.trim() !== '') blocks.push(md)
  })
}

export function serializeDomToMarkdown(rootEl) {
  if (!rootEl) return ''
  const blocks = []
  collectBlocks(rootEl, blocks)
  return blocks.join('\n\n')
}
