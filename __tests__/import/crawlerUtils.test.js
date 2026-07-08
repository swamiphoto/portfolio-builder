/**
 * @jest-environment node
 */
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls } from '@/common/import/crawlerUtils'

describe('normalizeUrl', () => {
  it('adds https:// when missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
  })
  it('returns null for empty/invalid', () => {
    expect(normalizeUrl('')).toBeNull()
  })
})

describe('isSameDomain', () => {
  it('matches same origin only', () => {
    expect(isSameDomain('https://a.com/x', 'https://a.com')).toBe(true)
    expect(isSameDomain('https://b.com/x', 'https://a.com')).toBe(false)
  })
})

const HTML = `
  <html><head><title>Joe's Photos</title>
  <meta property="og:image" content="/og/hero.jpg"></head>
  <body>
    <img src="/img/one.jpg" srcset="/img/one-500.jpg 500w, /img/one-1500.jpg 1500w">
    <img data-src="data:image/gif;base64,zzz">
    <div style="background-image:url('/img/bg.jpg')"></div>
    <a href="/galleries/travel">Travel</a>
    <a href="https://other.com/x">External</a>
  </body></html>`

describe('extractTitle', () => {
  it('reads the <title>', () => {
    expect(extractTitle(HTML)).toBe("Joe's Photos")
  })
})

describe('extractImageUrls', () => {
  const { images, links } = extractImageUrls(HTML, 'https://joe.com/home')
  it('resolves relative image urls to absolute', () => {
    expect(images).toContain('https://joe.com/img/one.jpg')
    expect(images).toContain('https://joe.com/og/hero.jpg')
    expect(images).toContain('https://joe.com/img/bg.jpg')
  })
  it('picks the largest srcset candidate', () => {
    expect(images).toContain('https://joe.com/img/one-1500.jpg')
  })
  it('excludes data: URIs', () => {
    expect(images.some((u) => u.startsWith('data:'))).toBe(false)
  })
  it('collects same-and-cross-domain links (filtering is the crawler\'s job)', () => {
    expect(links).toContain('https://joe.com/galleries/travel')
  })
})
