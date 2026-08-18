/**
 * @jest-environment node
 */
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls, extractPageContent, extractNavLinks, extractVideoUrls } from '@/common/import/crawlerUtils'

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

// SmugMug custom-domain sites (and other JS-rendered builders) render their nav
// entirely with JavaScript: the raw HTML contains ZERO <a href> page links. The
// only route to the subpages is the homepage's inline JSON, which carries entries
// like "UrlPath":"\/India" (escaped slashes) and absolute same-origin page URLs.
const SCRIPT_NAV = `<html><head><title>Sam</title></head><body>
  <div id="app"></div>
  <script>window.__INITIAL__ = {"nodes":[
    {"UrlPath":"\\/India","Name":"India"},
    {"UrlPath":"\\/Clients\\/Weddings-and-Receptions","Name":"Weddings"},
    {"UrlPath":"\\u002FAvifauna","Name":"Avifauna"},
    {"UrlPath":"","Name":"empty"},
    {"UrlPath":"\\/","Name":"root"},
    {"urlPath":"\\/Travel","Name":"lowercase key"},
    {"WebUri":"https:\\/\\/sam.com\\/Landscapes"},
    {"OffSite":"https:\\/\\/other.com\\/NotMine"},
    {"Photo":"https:\\/\\/sam.com\\/photos\\/p1.jpg"},
    {"Style":"https:\\/\\/sam.com\\/theme.css?v=3"},
    {"Bundle":"https:\\/\\/sam.com\\/app.js"}
  ]}</script>
</body></html>`

describe('extractImageUrls — script-JSON page links (JS-rendered nav)', () => {
  const { images, links } = extractImageUrls(SCRIPT_NAV, 'https://sam.com/')

  it('collects UrlPath values from inline JSON, unescaped and resolved against base', () => {
    expect(links).toContain('https://sam.com/India')
    expect(links).toContain('https://sam.com/Clients/Weddings-and-Receptions')
    expect(links).toContain('https://sam.com/Avifauna')
  })
  it('accepts the lowercase urlPath key form', () => {
    expect(links).toContain('https://sam.com/Travel')
  })
  it('skips empty and "/" UrlPath values', () => {
    expect(links).not.toContain('https://sam.com/')
  })
  it('collects absolute same-origin page URLs from script text', () => {
    expect(links).toContain('https://sam.com/Landscapes')
  })
  it('does NOT collect off-origin absolute URLs from scripts', () => {
    expect(links.some((l) => l.includes('other.com'))).toBe(false)
  })
  it('does NOT let asset URLs (images/css/js) enter links', () => {
    expect(links.some((l) => /\.(?:jpg|css|js)(?:\?|$)/.test(l))).toBe(false)
    // the image URL still lands in images, as before
    expect(images).toContain('https://sam.com/photos/p1.jpg')
  })
  it('caps script-derived links at 60 per page', () => {
    const many = Array.from({ length: 100 }, (_, i) => `{"UrlPath":"\\/page-${i}"}`).join(',')
    const html = `<script>var x = [${many}]</script>`
    const { links: capped } = extractImageUrls(html, 'https://sam.com/')
    expect(capped.length).toBe(60)
  })
})

describe('extractPageContent', () => {
  it('extracts prose paragraphs, drops nav/header/footer/script chrome', () => {
    const html = `<html><head><script>var x=1</script></head><body>
      <nav><a href="/about">About</a></nav>
      <main><p>I am a photographer based in Austin.</p><p>I shoot landscapes and portraits.</p></main>
      <footer>© 2026</footer></body></html>`
    const r = extractPageContent(html)
    expect(r.text).toBe('I am a photographer based in Austin.\n\nI shoot landscapes and portraits.')
    expect(r.wordCount).toBe(12)
    expect(r.hasForm).toBe(false)
    expect(r.hasMailto).toBe(false)
  })
  it('detects forms and mailto links', () => {
    const html = `<body><form><input/></form><a href="mailto:hi@x.com">email me</a></body>`
    const r = extractPageContent(html)
    expect(r.hasForm).toBe(true)
    expect(r.hasMailto).toBe(true)
  })
})

describe('extractVideoUrls', () => {
  it('collects a YouTube iframe embed and normalizes it to a watch URL', () => {
    const html = `<iframe src="https://www.youtube.com/embed/abc123XYZ_-"></iframe>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://www.youtube.com/watch?v=abc123XYZ_-'])
  })

  it('collects a youtube-nocookie iframe embed and normalizes it', () => {
    const html = `<iframe src="https://www.youtube-nocookie.com/embed/nocookie1"></iframe>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://www.youtube.com/watch?v=nocookie1'])
  })

  it('collects a Vimeo player iframe embed and normalizes it to a vimeo.com URL', () => {
    const html = `<iframe src="https://player.vimeo.com/video/123456789"></iframe>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://vimeo.com/123456789'])
  })

  it('collects a youtube.com/watch link from an <a href>', () => {
    const html = `<a href="https://www.youtube.com/watch?v=watchId01">Watch</a>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://www.youtube.com/watch?v=watchId01'])
  })

  it('collects a youtu.be short link and normalizes it to a watch URL', () => {
    const html = `<a href="https://youtu.be/shortId1">Watch</a>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://www.youtube.com/watch?v=shortId1'])
  })

  it('collects a vimeo.com/<digits> link from an <a href>', () => {
    const html = `<a href="https://vimeo.com/987654321">Watch</a>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://vimeo.com/987654321'])
  })

  it('dedupes the same video reached via embed and link', () => {
    const html = `
      <iframe src="https://www.youtube.com/embed/dupeId1"></iframe>
      <a href="https://youtu.be/dupeId1">Watch again</a>
    `
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual(['https://www.youtube.com/watch?v=dupeId1'])
  })

  it('caps results at 10', () => {
    const html = Array.from({ length: 15 }, (_, i) => `<a href="https://vimeo.com/${100000 + i}">v${i}</a>`).join('')
    expect(extractVideoUrls(html, 'https://joe.com')).toHaveLength(10)
  })

  it('ignores unrelated iframes and links', () => {
    const html = `<iframe src="https://maps.google.com/embed?x=1"></iframe><a href="https://joe.com/about">About</a>`
    expect(extractVideoUrls(html, 'https://joe.com')).toEqual([])
  })
})

describe('extractNavLinks', () => {
  it('returns nav/header links resolved against base, in document order, deduped', () => {
    const html = `<body><header><a href="/">Home</a><a href="/work">Work</a></header>
      <nav><a href="/about">About</a><a href="/work">Work</a></nav>
      <main><a href="/hidden">not nav</a></main></body>`
    expect(extractNavLinks(html, 'https://site.com/')).toEqual([
      { href: 'https://site.com/', label: 'Home' },
      { href: 'https://site.com/work', label: 'Work' },
      { href: 'https://site.com/about', label: 'About' },
    ])
  })
})
