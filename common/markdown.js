// Minimal safe markdown: headings, bold, italic, links, quotes, unordered
// lists, images-on-their-own-line. Everything else — including raw HTML — is
// literal text. Output is an AST; rendering builds React elements, so there
// is no injection surface by construction.

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/

export function parseInline(text) {
  const s = String(text ?? '')
  const nodes = []
  let i = 0
  let buf = ''
  const flush = () => { if (buf) { nodes.push({ type: 'text', value: buf }); buf = '' } }

  while (i < s.length) {
    const rest = s.slice(i)
    let m
    if ((m = /^\*\*([^*]+)\*\*/.exec(rest))) {
      flush(); nodes.push({ type: 'bold', children: parseInline(m[1]) }); i += m[0].length
    } else if ((m = /^\*([^*]+)\*/.exec(rest)) || (m = /^_([^_]+)_/.exec(rest))) {
      flush(); nodes.push({ type: 'italic', children: parseInline(m[1]) }); i += m[0].length
    } else if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) {
      flush(); nodes.push({ type: 'link', url: m[2], children: parseInline(m[1]) }); i += m[0].length
    } else {
      buf += s[i]; i += 1
    }
  }
  flush()
  return nodes
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
    } else if (first.startsWith('>')) {
      const quote = lines.map((l) => l.replace(/^>\s?/, '')).join('\n')
      blocks.push({ type: 'quote', children: parseInline(quote) })
    } else if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
      blocks.push({ type: 'list', items: lines.map((l) => parseInline(l.trim().replace(/^[-*]\s+/, ''))) })
    } else if ((m = IMAGE_LINE.exec(first)) && lines.length === 1) {
      blocks.push({ type: 'image', url: m[2], caption: m[1] })
    } else {
      // Mixed chunk: pull out any image-only lines, group the rest as a paragraph
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
  }
  return blocks
}
