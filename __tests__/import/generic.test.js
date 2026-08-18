/**
 * @jest-environment node
 */
import generic from '@/common/import/adapters/generic'

function fakeSite() {
  const pages = {
    'https://joe.com/': `<title>Joe</title>
      <a href="/travel">t</a><a href="/food">f</a>
      <img src="/logo.png"><img src="/home-hero.jpg">`,
    'https://joe.com/travel': `<img src="/t1.jpg"><img src="/t2.jpg"><img src="/logo.png">`,
    'https://joe.com/food': `<img src="/f1.jpg"><img src="/logo.png">`,
  }
  return (url) => {
    if (pages[url] == null) return Promise.reject(new Error('404'))
    return Promise.resolve(pages[url])
  }
}

describe('generic.discover', () => {
  it('crawls same-domain pages and returns collections without junk', async () => {
    const result = await generic.discover('joe.com', { fetchPage: fakeSite(), maxPages: 10 })
    expect(result.site.title).toBe('Joe')
    const allImages = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    expect(allImages).toContain('https://joe.com/t1.jpg')
    expect(allImages).toContain('https://joe.com/f1.jpg')
    expect(allImages.some((u) => u.includes('logo.png'))).toBe(false)
    const ids = result.collections.map((c) => c.id).sort()
    expect(ids).toEqual(['food', 'home', 'travel'])
  })

  it('a specific page URL imports ONLY that page as one collection (no whole-site crawl)', async () => {
    const result = await generic.discover('joe.com/travel', { fetchPage: fakeSite(), maxPages: 10 })
    // one collection (the page), named from the last path segment
    expect(result.collections).toHaveLength(1)
    expect(result.collections[0].name).toBe('Travel')
    const images = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    expect(images).toEqual(expect.arrayContaining(['https://joe.com/t1.jpg', 'https://joe.com/t2.jpg']))
    // did NOT crawl into /food or the home page
    expect(images.some((u) => u.includes('/f1.jpg') || u.includes('home-hero'))).toBe(false)
  })

  it('a bare domain still crawls the whole site into per-page albums', async () => {
    const result = await generic.discover('joe.com', { fetchPage: fakeSite(), maxPages: 10 })
    expect(result.collections.length).toBeGreaterThan(1)
  })

  it('stays on the same domain', async () => {
    const fetchPage = (url) =>
      url === 'https://joe.com/'
        ? Promise.resolve('<a href="https://evil.com/x">x</a><img src="/ok.jpg">')
        : Promise.reject(new Error('should not fetch ' + url))
    const result = await generic.discover('joe.com', { fetchPage, maxPages: 10 })
    const images = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    expect(images).toContain('https://joe.com/ok.jpg')
  })
})

describe('generic.discover size-variant collapse (SmugMug CDN duplication)', () => {
  // SmugMug custom-domain sites reference several size variants of the SAME photo
  // (srcset-style, or separate <img> tags for thumb + lightbox). Without collapsing
  // by image identity, each size becomes a distinct "duplicate" photo in the import.
  const PAGES = {
    'https://gal.com/': `<title>Gal</title>
      <img src="https://photos.smugmug.com/Trip/i-XyZ99/0/abc/M/sunset-M.jpg">
      <img src="https://photos.smugmug.com/Trip/i-XyZ99/0/abc/L/sunset-L.jpg">
      <img src="https://photos.smugmug.com/Trip/i-XyZ99/0/abc/X3/sunset-X3.jpg">
      <img src="https://photos.smugmug.com/Trip/i-Other1/0/abc/M/beach-M.jpg">`,
  }
  const fetchPage = (url) => (PAGES[url] != null ? Promise.resolve(PAGES[url]) : Promise.reject(new Error('404')))

  it('collapses M/L/X3 variants of the same SmugMug image to ONE ref at the largest size', async () => {
    const result = await generic.discover('gal.com/', { fetchPage, maxPages: 10 })
    const images = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    const sunsetRefs = images.filter((u) => u.includes('i-XyZ99'))
    expect(sunsetRefs).toEqual(['https://photos.smugmug.com/Trip/i-XyZ99/0/abc/X3/sunset-X3.jpg'])
    // Distinct image key stays a separate photo.
    expect(images.some((u) => u.includes('i-Other1'))).toBe(true)
  })
})

describe('generic.discover attribution (SmugMug-shaped site)', () => {
  // Mirrors www.sankarsalvady.com (SmugMug custom domain): the homepage is
  // JS-rendered and its inline hydration <script> JSON embeds the URLs of every
  // photo on the ENTIRE site, not just what's visually on the homepage. Each
  // gallery subpage also independently references its own subset (mixed between
  // <img> tags and inline JSON, like real gallery templates). A naive "first page
  // wins" crawler would attribute every photo to the homepage and produce one
  // giant collection instead of Landscapes / India / USA Travel.
  const landPhotos = [1, 2, 3, 4].map((n) => `https://sam.com/photos/land${n}.jpg`)
  const indiaPhotos = [1, 2, 3, 4].map((n) => `https://sam.com/photos/india${n}.jpg`)
  const usaPhotos = [1, 2, 3, 4].map((n) => `https://sam.com/photos/usa${n}.jpg`)
  const allPhotos = [...landPhotos, ...indiaPhotos, ...usaPhotos]

  const PAGES = {
    'https://sam.com/': `<title>Sam</title>
      <nav><a href="/landscapes">Landscapes</a><a href="/india">India</a><a href="/usa-travel">USA Travel</a></nav>
      <img src="/hero-portrait.jpg">
      <script>window.__DATA__ = ${JSON.stringify({ allPhotos })}</script>`,
    // <img> tags — the subpage's own DOM markup.
    'https://sam.com/landscapes': `<title>Landscapes</title>${landPhotos.map((u) => `<img src="${u}">`).join('')}`,
    // inline JSON — mixes the two extraction paths per the real templates.
    'https://sam.com/india': `<title>India</title><script>window.__DATA__ = ${JSON.stringify({ photos: indiaPhotos })}</script>`,
    'https://sam.com/usa-travel': `<title>USA Travel</title>${usaPhotos.map((u) => `<img src="${u}">`).join('')}`,
  }
  const fetchPage = (url) => {
    if (PAGES[url] == null) return Promise.reject(new Error('404'))
    return Promise.resolve(PAGES[url])
  }

  it('attributes photos to the gallery subpage they belong to, not the root page', async () => {
    const result = await generic.discover('sam.com', { fetchPage, maxPages: 10 })

    const byId = Object.fromEntries(result.collections.map((c) => [c.id, c]))
    const idsWithPhotos = Object.keys(byId).sort()
    expect(idsWithPhotos).toEqual(['home', 'india', 'landscapes', 'usa-travel'])

    expect(byId['landscapes'].assetRefs.map((r) => r.remoteUrl).sort()).toEqual([...landPhotos].sort())
    expect(byId['india'].assetRefs.map((r) => r.remoteUrl).sort()).toEqual([...indiaPhotos].sort())
    expect(byId['usa-travel'].assetRefs.map((r) => r.remoteUrl).sort()).toEqual([...usaPhotos].sort())

    // No giant catch-all collection: the root page (home) only keeps the photo
    // that is genuinely root-only (the hero portrait, never seen anywhere else).
    expect(byId['home'].assetRefs.map((r) => r.remoteUrl)).toEqual(['https://sam.com/hero-portrait.jpg'])
  })

  it('does not let the repeat-ratio junk filter drop the reattributed album photos', async () => {
    // 4 total pages crawled (root + 3 subpages) means the repeat-ratio rule is
    // active. Each album photo appears on exactly 2 of the 4 pages (root's JSON
    // dump + its own subpage) — the 50% boundary — and must still survive.
    const result = await generic.discover('sam.com', { fetchPage, maxPages: 10 })
    const allUrls = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    expect(allUrls).toEqual(expect.arrayContaining(allPhotos))
  })

  it('classifies the gallery subpages as galleries in the siteMap using page-local image counts', async () => {
    const result = await generic.discover('sam.com', { fetchPage, maxPages: 10 })
    const bySlug = Object.fromEntries(result.siteMap.pages.map((p) => [p.slug, p]))
    // Each subpage's imageCount reflects what's on THAT page (4 photos each), not
    // the homepage's 12-photo full-site dump — confirming imageCount is computed
    // per-page rather than inherited from the reattributed collection.
    expect(bySlug['landscapes'].kind).toBe('gallery')
    expect(bySlug['india'].kind).toBe('gallery')
    expect(bySlug['usa-travel'].kind).toBe('gallery')
    expect(bySlug['landscapes'].collectionId).toBe('landscapes')
    expect(bySlug['india'].collectionId).toBe('india')
    expect(bySlug['usa-travel'].collectionId).toBe('usa-travel')
  })
})

describe('generic.discover — JS-rendered nav (page links only in inline script JSON)', () => {
  // The second half of the real www.sankarsalvady.com failure: SmugMug custom-
  // domain sites render nav with JS, so the raw HTML has ZERO <a href> page
  // links. Subpages are only discoverable via the homepage's inline JSON
  // ("UrlPath":"\/India" with escaped slashes, or absolute same-origin URLs).
  // Without script-link discovery the BFS never leaves the homepage.
  const landPhotos = [1, 2, 3, 4].map((n) => `https://sam.com/photos/land${n}.jpg`)
  const indiaPhotos = [1, 2, 3, 4].map((n) => `https://sam.com/photos/india${n}.jpg`)

  const PAGES = {
    // No <a> tags anywhere. One gallery referenced by escaped UrlPath, the other
    // by an absolute same-origin URL inside the same script blob.
    'https://sam.com/': `<title>Sam</title>
      <div id="app"></div>
      <script>window.__INITIAL__ = {"nav":[
        {"UrlPath":"\\/landscapes","Name":"Landscapes"},
        {"WebUri":"https:\\/\\/sam.com\\/india"}
      ],"allPhotos":${JSON.stringify([...landPhotos, ...indiaPhotos]).replace(/\//g, '\\/')}}</script>`,
    'https://sam.com/landscapes': `<title>Landscapes</title>${landPhotos.map((u) => `<img src="${u}">`).join('')}`,
    'https://sam.com/india': `<title>India</title>${indiaPhotos.map((u) => `<img src="${u}">`).join('')}`,
  }
  const fetchPage = (url) => {
    if (PAGES[url] == null) return Promise.reject(new Error('404'))
    return Promise.resolve(PAGES[url])
  }

  it('crawls subpages reachable only through script JSON and builds per-page collections', async () => {
    const result = await generic.discover('sam.com', { fetchPage, maxPages: 10 })
    const byId = Object.fromEntries(result.collections.map((c) => [c.id, c]))
    expect(Object.keys(byId).sort()).toEqual(['india', 'landscapes'])
    expect(byId['landscapes'].assetRefs.map((r) => r.remoteUrl).sort()).toEqual([...landPhotos].sort())
    expect(byId['india'].assetRefs.map((r) => r.remoteUrl).sort()).toEqual([...indiaPhotos].sort())
  })

  it('classifies the script-discovered subpages in the siteMap', async () => {
    const result = await generic.discover('sam.com', { fetchPage, maxPages: 10 })
    const bySlug = Object.fromEntries(result.siteMap.pages.map((p) => [p.slug, p]))
    expect(bySlug['landscapes'].kind).toBe('gallery')
    expect(bySlug['india'].kind).toBe('gallery')
    expect(bySlug['landscapes'].collectionId).toBe('landscapes')
    expect(bySlug['india'].collectionId).toBe('india')
  })
})

describe('generic.discover siteMap', () => {
  const IMG = (n) => Array.from({ length: n }, (_, i) => `<img src="/photos/p${i}.jpg">`).join('')
  const PAGES = {
    'https://x.com/': `<html><title>Jane</title><body><nav><a href="/work">Work</a><a href="/about">About</a><a href="/contact">Contact</a></nav>${IMG(10)}</body></html>`,
    'https://x.com/work': `<html><title>Work</title><body>${IMG(20)}</body></html>`,
    'https://x.com/about': `<html><title>About</title><body><main>${'<p>I am Jane and I shoot portraits in Austin every day of the week and love it dearly.</p>'.repeat(12)}</main><img src="/photos/me.jpg"></body></html>`,
    'https://x.com/contact': `<html><title>Contact</title><body><form><input/></form><p>Say hello.</p></body></html>`,
  }
  const fetchPage = async (url) => {
    const clean = url.replace(/\/+$/, '') || url
    const html = PAGES[url] || PAGES[clean] || PAGES[`${clean}/`]
    if (!html) throw new Error('404')
    return html
  }

  it('returns a classified siteMap alongside collections', async () => {
    const result = await generic.discover('https://x.com', { fetchPage })
    expect(result.siteMap).toBeTruthy()
    const kinds = Object.fromEntries(result.siteMap.pages.map((p) => [p.slug, p.kind]))
    expect(kinds['work']).toBe('gallery')
    expect(kinds['about']).toBe('about')
    expect(kinds['contact']).toBe('contact')
    expect(result.siteMap.pages.find((p) => p.kind === 'about').textContent).toMatch(/I am Jane/)
  })

  it('returns siteMap null in single-page mode', async () => {
    const result = await generic.discover('https://x.com/work', { fetchPage })
    expect(result.siteMap).toBeNull()
  })

  it('threads discovered video URLs onto the about page in the siteMap', async () => {
    const pagesWithVideo = {
      ...PAGES,
      'https://x.com/about': `<html><title>About</title><body><main>${'<p>I am Jane and I shoot portraits in Austin every day of the week and love it dearly.</p>'.repeat(12)}</main><img src="/photos/me.jpg"><iframe src="https://www.youtube.com/embed/aboutVid1"></iframe></body></html>`,
    }
    const fetchVideoPage = async (url) => {
      const clean = url.replace(/\/+$/, '') || url
      const html = pagesWithVideo[url] || pagesWithVideo[clean] || pagesWithVideo[`${clean}/`]
      if (!html) throw new Error('404')
      return html
    }
    const result = await generic.discover('https://x.com', { fetchPage: fetchVideoPage })
    const about = result.siteMap.pages.find((p) => p.kind === 'about')
    expect(about.videoUrls).toEqual(['https://www.youtube.com/watch?v=aboutVid1'])
    const work = result.siteMap.pages.find((p) => p.slug === 'work')
    expect(work.videoUrls).toEqual([])
  })
})
