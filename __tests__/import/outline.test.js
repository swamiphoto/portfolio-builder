/** @jest-environment node */
import { extractPageOutline } from '@/common/import/crawlerUtils'

const HTML = `<body><main>
  <h1>Portfolio</h1>
  <p>Welcome to my work.</p>
  <figure><img src="/a.jpg"><figcaption>San Francisco in fog</figcaption></figure>
  <img src="/b.jpg" alt="Eiffel at dawn">
  <blockquote>Best photographer ever.<cite>Naga M</cite></blockquote>
  <div class="cards">
    <a href="/portfolio/landscapes"><img src="/l.jpg">Landscapes</a>
    <a href="/portfolio/portraits"><img src="/p.jpg">Portraits</a>
  </div>
</main></body>`

describe('extractPageOutline', () => {
  const nodes = extractPageOutline(HTML, 'https://x.com/portfolio')

  it('assigns sequential image refs in document order', () => {
    const imgs = nodes.filter((n) => n.kind === 'image')
    // Only the two non-card images: link-card thumbnails live inside the
    // linkcards node, not as standalone image nodes.
    expect(imgs.map((n) => n.ref)).toEqual(['img-1', 'img-2'])
    expect(imgs[0].src).toBe('https://x.com/a.jpg')
  })
  it('captures a figcaption as the image caption', () => {
    expect(nodes.find((n) => n.src === 'https://x.com/a.jpg').caption).toBe('San Francisco in fog')
  })
  it('falls back to alt text for the caption', () => {
    expect(nodes.find((n) => n.src === 'https://x.com/b.jpg').caption).toBe('Eiffel at dawn')
  })
  it('emits heading, paragraph, and quote nodes in order', () => {
    expect(nodes[0]).toMatchObject({ kind: 'heading', level: 1, text: 'Portfolio' })
    expect(nodes[1]).toMatchObject({ kind: 'paragraph', text: 'Welcome to my work.' })
    expect(nodes.find((n) => n.kind === 'quote')).toMatchObject({ text: 'Best photographer ever.', attribution: 'Naga M' })
  })
  it('groups repeated image+link cards into one linkcards node', () => {
    const cards = nodes.find((n) => n.kind === 'linkcards')
    expect(cards.items).toEqual([
      { href: 'https://x.com/portfolio/landscapes', label: 'Landscapes' },
      { href: 'https://x.com/portfolio/portraits', label: 'Portraits' },
    ])
  })
  it('does not treat sibling image-file lightbox links as link cards', () => {
    const html = `<body><main>
      <a href="/p1-large.jpg"><img src="/p1.jpg"></a>
      <a href="/p2-large.jpg"><img src="/p2.jpg"></a>
    </main></body>`
    const out = extractPageOutline(html, 'https://x.com/gallery')
    expect(out.find((n) => n.kind === 'linkcards')).toBeUndefined()
    const imgs = out.filter((n) => n.kind === 'image')
    expect(imgs.map((n) => n.ref)).toEqual(['img-1', 'img-2'])
    expect(imgs.map((n) => n.src)).toEqual(['https://x.com/p1.jpg', 'https://x.com/p2.jpg'])
  })
})
