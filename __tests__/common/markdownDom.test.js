import { renderMarkdownToElement, serializeDomToMarkdown, createImageBlockNode, getImageAttrs, setImageAttr, removeImageWrapper, moveImageWrapper } from '@/common/markdownDom'
import { parseMarkdown } from '@/common/markdown'

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

  it('keeps separate paragraphs nested inside a wrapper', () => {
    const host = document.createElement('div')
    host.innerHTML = '<div><p>First paragraph.</p><p>Second paragraph.</p></div>'
    expect(serializeDomToMarkdown(host)).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('preserves headings, paragraphs and images pasted as a nested doc', () => {
    const host = document.createElement('div')
    host.innerHTML = '<b style="font-weight:normal"><h2>My Trip</h2><p>Shot in <span style="font-style:italic">Norway</span>.</p><p><img src="https://gcs/a.jpg"></p></b>'
    expect(serializeDomToMarkdown(host)).toBe('# My Trip\n\nShot in *Norway*.\n\n![](https://gcs/a.jpg)')
  })

  it('escapes a ] in a bare pasted <img alt> so the image is not lost on reparse', () => {
    const host = document.createElement('div')
    const img = document.createElement('img')
    img.setAttribute('src', 'https://gcs/a.jpg')
    img.setAttribute('alt', 'Portra 400 [expired]')
    host.appendChild(img)
    const md = serializeDomToMarkdown(host)
    expect(md).toBe('![Portra 400 [expired\\]](https://gcs/a.jpg)')
    const [node] = parseMarkdown(md)
    expect(node).toMatchObject({ type: 'image', caption: 'Portra 400 [expired]' })
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
    host.appendChild(createImageBlockNode(document, 'https://gcs/pic.jpg'))
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

describe('image wrapper — editor styling + library caption', () => {
  it('applies layout/size inline styles and previews the library caption', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', { layout: 'side', size: 'm', style: 'serif' }, 'A cat')
    expect(w.style.float).toBe('left')
    expect(w.style.width).toBe('40%')
    expect(getImageAttrs(w)).toEqual({ layout: 'side', size: 'm', style: 'serif' })
    const cap = w.querySelector('[data-md-caption]')
    expect(cap).toBeTruthy()
    expect(cap.textContent).toBe('A cat')
  })
  it('serializes to ![](url){…} with no caption text', () => {
    const root = document.createElement('div')
    root.appendChild(createImageBlockNode(document, 'http://x/c.jpg', { layout: 'side', size: 'm' }, 'A cat'))
    expect(serializeDomToMarkdown(root)).toBe('![](http://x/c.jpg){layout=side size=m}')
  })
  it('setImageAttr re-applies layout styling', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', { layout: 'centered', size: 'l' }, '')
    expect(w.style.float).toBe('none')
    setImageAttr(w, 'layout', 'side')
    expect(w.style.float).toBe('left')
  })
  it('renderMarkdownToElement supplies captions from captionByUrl', () => {
    const el = renderMarkdownToElement('![](http://x/c.jpg){layout=centered}', document, { 'http://x/c.jpg': 'From library' })
    expect(el.querySelector('[data-md-caption]').textContent).toBe('From library')
  })
  it('a bare image still round-trips', () => {
    const root = document.createElement('div')
    root.appendChild(createImageBlockNode(document, 'http://x/c.jpg', {}, ''))
    expect(serializeDomToMarkdown(root)).toBe('![](http://x/c.jpg)')
  })
  it('a wrapper with no caption renders no [data-md-caption] node', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', {}, '')
    expect(w.querySelector('[data-md-caption]')).toBeNull()
  })
  it('renderMarkdownToElement rebuilds a wrapper carrying the attrs (no caption from markdown alt)', () => {
    const el = renderMarkdownToElement('![A cat](http://x/c.jpg){layout=full-bleed}', document)
    expect(getImageAttrs(el.firstChild)).toMatchObject({ layout: 'full-bleed' })
    expect(el.firstChild.querySelector('[data-md-caption]')).toBeNull()
  })
  it('setImageAttr sets and clears data attrs', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg')
    setImageAttr(w, 'layout', 'side'); expect(getImageAttrs(w).layout).toBe('side')
    setImageAttr(w, 'layout', ''); expect(getImageAttrs(w).layout).toBeUndefined()
  })
})

describe('image wrapper remove/move', () => {
  function root() {
    const r = document.createElement('div')
    const p = document.createElement('p'); p.textContent = 'A'; r.appendChild(p)
    r.appendChild(createImageBlockNode(document, 'http://x/c.jpg'))
    const p2 = document.createElement('p'); p2.textContent = 'B'; r.appendChild(p2)
    return r
  }
  it('removeImageWrapper detaches the node and returns its src', () => {
    const r = root(); const w = r.querySelector('[data-md-image]')
    expect(removeImageWrapper(w)).toBe('http://x/c.jpg')
    expect(r.querySelector('[data-md-image]')).toBeNull()
  })
  it('moveImageWrapper reorders among top-level siblings', () => {
    const r = root(); const w = r.querySelector('[data-md-image]')
    expect(moveImageWrapper(w, -1)).toBe(true)
    expect(r.firstElementChild.hasAttribute('data-md-image')).toBe(true)
    expect(moveImageWrapper(r.querySelector('[data-md-image]'), -1)).toBe(false) // already first
  })
})
