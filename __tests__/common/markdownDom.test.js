import { renderMarkdownToElement, serializeDomToMarkdown, createImageBlockNode } from '@/common/markdownDom'

// Round trips: renderMarkdownToElement -> serializeDomToMarkdown should
// return the exact input for markdown the serializer can reproduce
// losslessly. Heading level is intentionally NOT preserved (the panel shows
// one visual heading size and the serializer always writes '# '), so only
// level-1 headings are included here — that's a documented, deliberate
// asymmetry, not a bug.
const ROUND_TRIP_SAMPLES = [
  'Hello world',
  'First paragraph.\n\nSecond paragraph.',
  '# Title',
  '# **Bold title**',
  'Hello **bold** and *ital* text.',
  '> a quote',
  '- one\n- two\n- three',
  '![](https://gcs/me.jpg)',
  '# Title\n\nHello **bold** and *ital*.\n\n> a quote\n\n- one\n- two\n\n![](https://gcs/me.jpg)',
]

describe('renderMarkdownToElement <-> serializeDomToMarkdown round trip', () => {
  it.each(ROUND_TRIP_SAMPLES)('round-trips %j', (md) => {
    const el = renderMarkdownToElement(md, document)
    const host = document.createElement('div')
    host.replaceChildren(...el.childNodes)
    expect(serializeDomToMarkdown(host)).toBe(md.trim())
  })
})

describe('serializeDomToMarkdown handles pasted rich text', () => {
  it('reads emphasis from inline-styled spans (as pasted), not just <b>/<i>', () => {
    const host = document.createElement('div')
    host.innerHTML = '<p>Hello <span style="font-weight:700">bold</span> and <span style="font-style:italic">ital</span> and <a href="https://x.com">link</a>.</p>'
    expect(serializeDomToMarkdown(host)).toBe('Hello **bold** and *ital* and [link](https://x.com).')
  })

  it('preserves a link nested inside a styled span', () => {
    const host = document.createElement('div')
    host.innerHTML = '<p><span style="font-weight:600"><a href="https://y.com">boldlink</a></span></p>'
    expect(serializeDomToMarkdown(host)).toBe('**[boldlink](https://y.com)**')
  })

  it('does not bold a Google-Docs <b style="font-weight:normal"> wrapper', () => {
    const host = document.createElement('div')
    host.innerHTML = '<b style="font-weight:normal">plain <span style="font-weight:700">bold</span></b>'
    expect(serializeDomToMarkdown(host)).toBe('plain **bold**')
  })
})

describe('renderMarkdownToElement', () => {
  it('builds real elements for headings, quotes, lists, emphasis and images', () => {
    const el = renderMarkdownToElement(
      '# Title\n\nHello **bold** and *ital*.\n\n> a quote\n\n- one\n- two\n\n![](https://gcs/me.jpg)',
      document
    )
    expect(el.querySelector('h3').textContent).toBe('Title')
    expect(el.querySelector('strong').textContent).toBe('bold')
    expect(el.querySelector('em').textContent).toBe('ital')
    expect(el.querySelector('blockquote').textContent).toBe('a quote')
    expect(el.querySelectorAll('li')).toHaveLength(2)
    const img = el.querySelector('img')
    expect(img.getAttribute('src')).toBe('https://gcs/me.jpg')
    // Image sits inside a non-editable wrapper so the caret can't enter it.
    expect(img.closest('[contenteditable="false"]')).toBeTruthy()
  })

  it('never turns a <script>-looking line into a real element — it stays literal text', () => {
    const el = renderMarkdownToElement('<script>alert(1)</script> hi', document)
    expect(el.querySelector('script')).toBeNull()
    expect(el.textContent).toContain('<script>alert(1)</script>')
  })

  it('round-trips a <script>-looking line as literal text through serialize too', () => {
    const md = '<script>alert(1)</script> hi'
    const el = renderMarkdownToElement(md, document)
    const host = document.createElement('div')
    host.replaceChildren(...el.childNodes)
    expect(host.querySelector('script')).toBeNull()
    expect(serializeDomToMarkdown(host)).toBe(md)
  })

  it('renders nested bold inside a heading', () => {
    const el = renderMarkdownToElement('# **Bold title**', document)
    const h = el.querySelector('h3')
    expect(h.querySelector('strong').textContent).toBe('Bold title')
  })
})

describe('serializeDomToMarkdown', () => {
  it('serializes a manually-built DOM (simulating browser contentEditable output)', () => {
    const host = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = 'plain paragraph'
    const h = document.createElement('h3')
    h.textContent = 'A heading'
    host.appendChild(p)
    host.appendChild(h)
    expect(serializeDomToMarkdown(host)).toBe('plain paragraph\n\n# A heading')
  })

  it('serializes an inserted image wrapper node built via createImageBlockNode', () => {
    const host = document.createElement('div')
    host.appendChild(createImageBlockNode(document, 'https://gcs/pic.jpg', ''))
    expect(serializeDomToMarkdown(host)).toBe('![](https://gcs/pic.jpg)')
  })

  it('ignores empty text nodes and bare <br> between blocks', () => {
    const host = document.createElement('div')
    host.appendChild(document.createTextNode('\n'))
    const p = document.createElement('p')
    p.textContent = 'hello'
    host.appendChild(p)
    host.appendChild(document.createElement('br'))
    expect(serializeDomToMarkdown(host)).toBe('hello')
  })
})
