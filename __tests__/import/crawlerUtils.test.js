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

// Many modern (JS-rendered) sites — Next.js, Gatsby, CMS-driven — put their real
// photo URLs in an inline JSON blob (e.g. __NEXT_DATA__) rather than in <img> tags
// that exist before JavaScript runs. The crawler must recover those.
const JSON_EMBEDDED = `<html><head><title>Gallery</title></head><body>
  <img src="/cover.jpg">
  <script id="__NEXT_DATA__" type="application/json">
    {"props":{"photos":[
      {"url":"https://storage.googleapis.com/swamiphoto/photos/japan/DSC00179.jpg"},
      {"url":"https:\\u002F\\u002Fstorage.googleapis.com\\u002Fswamiphoto\\u002Fphotos\\u002Fjapan\\u002FDSC00324.jpg"},
      {"url":"https:\\/\\/storage.googleapis.com\\/swamiphoto\\/photos\\/japan\\/DSC00328.png?w=2000"}
    ]}}
  </script>
  <script>window.__x = "https://cdn.example.com/tracking/pixel.gif"</script>
</body></html>`

describe('extractImageUrls — JSON/script-embedded photos', () => {
  const { images } = extractImageUrls(JSON_EMBEDDED, 'https://www.swamiphoto.com/galleries/japan')

  it('still gets the DOM <img>', () => {
    expect(images).toContain('https://www.swamiphoto.com/cover.jpg')
  })
  it('recovers plain absolute image URLs from inline JSON', () => {
    expect(images).toContain('https://storage.googleapis.com/swamiphoto/photos/japan/DSC00179.jpg')
  })
  it('recovers image URLs with escaped forward slashes (\\/ and \\u002F)', () => {
    expect(images).toContain('https://storage.googleapis.com/swamiphoto/photos/japan/DSC00324.jpg')
    expect(images).toContain('https://storage.googleapis.com/swamiphoto/photos/japan/DSC00328.png?w=2000')
  })
})
