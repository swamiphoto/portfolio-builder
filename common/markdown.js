// Minimal safe markdown: headings, bold, italic, links, quotes, unordered
// lists, images-on-their-own-line. Everything else — including raw HTML — is
// literal text. Output is an AST; rendering builds React elements, so there
// is no injection surface by construction.

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/

// Sticky (/y) tokenizers: anchored at lastIndex, so we scan the source in
// place — linear time, no per-character suffix slicing.
const BOLD_RE = /\*\*([^*]+)\*\*/y
const ITALIC_STAR_RE = /\*([^*]+)\*/y
const ITALIC_UNDERSCORE_RE = /_([^_]+)_/y
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/y

const stickyExec = (re, s, i) => { re.lastIndex = i; return re.exec(s) }

export function parseInline(text) {
  const s = String(text ?? '')
  const nodes = []
  let i = 0
  let buf = ''
  const flush = () => { if (buf) { nodes.push({ type: 'text', value: buf }); buf = '' } }

  while (i < s.length) {
    let m
    if ((m = stickyExec(BOLD_RE, s, i))) {
      flush(); nodes.push({ type: 'bold', children: parseInline(m[1]) }); i += m[0].length
    } else if ((m = stickyExec(ITALIC_STAR_RE, s, i)) || (m = stickyExec(ITALIC_UNDERSCORE_RE, s, i))) {
      flush(); nodes.push({ type: 'italic', children: parseInline(m[1]) }); i += m[0].length
    } else if ((m = stickyExec(LINK_RE, s, i))) {
      flush(); nodes.push({ type: 'link', url: m[2], children: parseInline(m[1]) }); i += m[0].length
    } else {
      buf += s[i]; i += 1
    }
  }
  flush()
  return nodes
}

// Mixed lines: pull out any image-only lines, group the rest as a paragraph
function pushMixedLines(blocks, lines) {
  let para = []
  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'paragraph', children: parseInline(para.join('\n')) }); para = [] }
  }
  for (const line of lines) {
    const im = IMAGE_LINE.exec(line.trim())
    if (im) { flushPara(); blocks.push({ type: 'image', url: im[2], caption: im[1] }) }
    else para.push(line)
  }
  flushPara()
}

// Seeds markdown text for the WYSIWYG editor when it opens a block that
// isn't already markdown-formatted. Maps the block's discrete variant
// (1 heading, 2 subheading, 3 body, 4 quote) onto the matching markdown
// prefix so the editor opens showing equivalent formatting instead of
// silently dropping it. Markdown blocks pass their content through as-is —
// this is a one-time conversion on open, not an ongoing transform.
export function blockToMarkdownSeed(block) {
  if (!block) return ''
  const content = block.content || ''
  if (block.format === 'markdown') return content
  switch (block.variant) {
    case 1: return `# ${content}`
    case 2: return `## ${content}`
    case 4: return `> ${content}`
    default: return content
  }
}

export function parseMarkdown(text) {
  const src = String(text ?? '').replace(/\r\n/g, '\n').trim()
  if (!src) return []
  const blocks = []
  for (const chunk of src.split(/\n{2,}/)) {
    const lines = chunk.split('\n')
    const first = lines[0].trim()
    let m
    if ((m = /^(#{1,3})\s+(.*)$/.exec(first))) {
      blocks.push({ type: 'heading', level: m[1].length, children: parseInline(m[2]) })
      if (lines.length > 1) pushMixedLines(blocks, lines.slice(1))
    } else if (first.startsWith('>')) {
      const quote = lines.map((l) => l.replace(/^>\s?/, '')).join('\n')
      blocks.push({ type: 'quote', children: parseInline(quote) })
    } else if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
      blocks.push({ type: 'list', items: lines.map((l) => parseInline(l.trim().replace(/^[-*]\s+/, ''))) })
    } else if ((m = IMAGE_LINE.exec(first)) && lines.length === 1) {
      blocks.push({ type: 'image', url: m[2], caption: m[1] })
    } else {
      pushMixedLines(blocks, lines)
    }
  }
  return blocks
}
