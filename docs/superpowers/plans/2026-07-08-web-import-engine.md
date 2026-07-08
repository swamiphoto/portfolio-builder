# Web Import Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend engine that discovers a photographer's existing web photos (SmugMug + any static/server-rendered site) and imports them into the Sepia Library as source-tagged assets organized into Sets.

**Architecture:** A `SourceAdapter` registry routes an input URL to either the SmugMug adapter (free API v2, clean gallery structure) or a universal generic crawler (static HTML + `og:image` extraction). `discover()` returns collection/asset metadata only (no downloads). The client then drives import in small batches through `POST /api/admin/import/fetch-batch`, which downloads each remote image, stores it via the existing upload pipeline (refactored into a shared `storeImageBuffer`), and returns partial asset records with the `source` field populated. No queue/worker — serverless-safe.

**Tech Stack:** Next.js (pages router), plain JavaScript, Jest (ESM `import`, `__tests__/**/*.test.js`), `@aws-sdk/client-s3` (R2), `sharp`, `node-fetch@2`, `cheerio` (new — HTML parsing).

## Global Constraints

- **Language:** plain JavaScript, no TypeScript. Next.js pages router.
- **Tests:** Jest. Files under `__tests__/**/*.test.js`. ESM `import` syntax. `@/` maps to project root. Run with `npx jest <path> -t "<name>"`.
- **Free only:** no paid services or APIs. SmugMug uses a free API key (`SMUGMUG_API_KEY`).
- **Reuse, don't duplicate:** reuse `common/gcsClient.js`, `common/adminConfig.js` (`createAssetIdFromUrl`, `createEmptyLibraryConfig`), and the `withAuth` auth wrapper. No changes to the library config schema.
- **Asset source vocabulary (verbatim):** `source.type = "import"`; `source.provider ∈ { "smugmug", "generic" }`. Populate `label`, `sourceUrl`, `externalCollectionId`, `importBatchId`, `lastSyncedAt`.
- **Serverless-safe:** no long-running jobs. Discovery is one request; import is client-orchestrated batches. Per-asset failures never throw the batch.
- **Storage key convention:** imported originals go under folder `photos/import`, i.e. keys `users/{userId}/photos/import/{filename}` (thumbnails auto-derived by the existing pipeline into `/thumbnails/`).
- **Copy rules:** any user-facing strings avoid AI-tell patterns (no fragment-stacks, "Not X. Just Y.", tricolons, theatrical em-dashes). Warm, plain prose.

---

### Task 1: Adapter contract + registry + detection

**Files:**
- Create: `common/import/adapters/index.js`
- Create: `common/import/adapters/smugmug.js` (stub for now — real `discover` in Task 6)
- Create: `common/import/adapters/generic.js` (stub for now — real `discover` in Task 5)
- Test: `__tests__/import/adapters.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `detectAdapter(input: string) -> adapter | null` — returns the adapter whose `detect()` matches, in priority order (smugmug → generic). Returns `null` for empty/invalid input.
  - `getAdapter(id: string) -> adapter | null`.
  - Each adapter: `{ id, label, icon, enabled, detect(input) -> boolean, discover(input, deps?) -> Promise<{ site, collections }> }`.
  - `PROVIDERS = { SMUGMUG: 'smugmug', GENERIC: 'generic' }`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/adapters.test.js
import { detectAdapter, getAdapter, PROVIDERS } from '@/common/import/adapters'

describe('adapter registry', () => {
  it('routes smugmug domains to the smugmug adapter', () => {
    expect(detectAdapter('https://joesmith.smugmug.com/Travel').id).toBe(PROVIDERS.SMUGMUG)
  })
  it('routes any other site to the generic adapter', () => {
    expect(detectAdapter('https://joesmith.com/portfolio').id).toBe(PROVIDERS.GENERIC)
    expect(detectAdapter('joesmith.squarespace.com').id).toBe(PROVIDERS.GENERIC)
  })
  it('returns null for empty input', () => {
    expect(detectAdapter('')).toBeNull()
    expect(detectAdapter('   ')).toBeNull()
  })
  it('never routes to a disabled adapter (instagram not present)', () => {
    expect(getAdapter('instagram')?.enabled).not.toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/adapters.test.js`
Expected: FAIL — cannot find module `@/common/import/adapters`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/import/adapters/generic.js
export const PROVIDER_ID = 'generic'
const generic = {
  id: PROVIDER_ID,
  label: 'Website',
  icon: 'globe',
  enabled: true,
  detect() {
    return true // universal fallback — matches anything
  },
  async discover() {
    throw new Error('generic.discover not implemented yet')
  },
}
export default generic
```

```javascript
// common/import/adapters/smugmug.js
export const PROVIDER_ID = 'smugmug'
const smugmug = {
  id: PROVIDER_ID,
  label: 'SmugMug',
  icon: 'smugmug',
  enabled: true,
  detect(input) {
    try {
      return /(^|\.)smugmug\.com$/i.test(new URL(normalize(input)).hostname)
    } catch {
      return false
    }
  },
  async discover() {
    throw new Error('smugmug.discover not implemented yet')
  },
}
function normalize(input) {
  const s = String(input || '').trim()
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}
export default smugmug
```

```javascript
// common/import/adapters/index.js
import generic from './generic'
import smugmug from './smugmug'

export const PROVIDERS = { SMUGMUG: 'smugmug', GENERIC: 'generic' }

// Priority order: specific adapters first, generic last (universal fallback).
const REGISTRY = [smugmug, generic]

export function detectAdapter(input) {
  const s = String(input || '').trim()
  if (!s) return null
  for (const adapter of REGISTRY) {
    if (adapter.enabled && adapter.detect(s)) return adapter
  }
  return null
}

export function getAdapter(id) {
  return REGISTRY.find((a) => a.id === id) || null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/adapters.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add common/import/adapters __tests__/import/adapters.test.js
git commit -m "feat(import): source adapter contract, registry, and URL detection"
```

---

### Task 2: Crawler utilities (URL + HTML image extraction)

**Files:**
- Modify: `package.json` (add `cheerio` dependency)
- Create: `common/import/crawlerUtils.js`
- Test: `__tests__/import/crawlerUtils.test.js`

**Interfaces:**
- Consumes: `cheerio`.
- Produces:
  - `normalizeUrl(input) -> string | null`
  - `isSameDomain(url, origin) -> boolean`
  - `extractTitle(html) -> string | null`
  - `extractImageUrls(html, baseUrl) -> { images: string[], links: string[] }` — absolute URLs, `data:` URIs excluded, deduped.

- [ ] **Step 1: Install cheerio**

Run: `npm install cheerio@^1.0.0`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

```javascript
// __tests__/import/crawlerUtils.test.js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/import/crawlerUtils.test.js`
Expected: FAIL — cannot find module `@/common/import/crawlerUtils`.

- [ ] **Step 4: Write minimal implementation**

```javascript
// common/import/crawlerUtils.js
import * as cheerio from 'cheerio'

export function normalizeUrl(input) {
  const s = String(input || '').trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    return new URL(withProto).toString()
  } catch {
    return null
  }
}

export function isSameDomain(url, origin) {
  try {
    return new URL(url).origin === new URL(origin).origin
  } catch {
    return false
  }
}

export function extractTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ''))
  return m ? m[1].trim() : null
}

function safeResolve(href, base) {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

function largestFromSrcset(srcset) {
  const candidates = String(srcset || '')
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .map(([url, descriptor]) => ({ url, w: parseInt(descriptor, 10) || 0 }))
    .filter((c) => c.url)
  if (!candidates.length) return null
  candidates.sort((a, b) => b.w - a.w)
  return candidates[0].url
}

export function extractImageUrls(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  const images = new Set()
  const links = new Set()
  const addImage = (raw) => {
    if (!raw) return
    const resolved = safeResolve(raw, baseUrl)
    if (resolved && !resolved.startsWith('data:')) images.add(resolved)
  }

  $('img').each((_, el) => {
    addImage($(el).attr('src'))
    addImage($(el).attr('data-src'))
    const srcset = $(el).attr('srcset')
    if (srcset) addImage(largestFromSrcset(srcset))
  })
  $('source[srcset]').each((_, el) => addImage(largestFromSrcset($(el).attr('srcset'))))
  $('meta[property="og:image"], meta[name="og:image"]').each((_, el) => addImage($(el).attr('content')))
  $('[style*="background-image"]').each((_, el) => {
    const m = /url\(['"]?([^'")]+)['"]?\)/.exec($(el).attr('style') || '')
    if (m) addImage(m[1])
  })
  $('a[href]').each((_, el) => {
    const resolved = safeResolve($(el).attr('href'), baseUrl)
    if (resolved) links.add(resolved.split('#')[0])
  })

  return { images: [...images], links: [...links] }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/import/crawlerUtils.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json common/import/crawlerUtils.js __tests__/import/crawlerUtils.test.js
git commit -m "feat(import): crawler URL + HTML image extraction utilities"
```

---

### Task 3: Junk filtering + collection grouping

**Files:**
- Create: `common/import/junkFilter.js`
- Test: `__tests__/import/junkFilter.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `filterJunkImages(refs, { totalPages, repeatRatio? }) -> refs[]` — drops filename-pattern junk (logo/icon/sprite/favicon/avatar/placeholder/spacer/pixel/blank) and images appearing on ≥`ceil(totalPages*repeatRatio)` pages when `totalPages >= 4`. Each ref: `{ remoteUrl, pageUrl, seenOnPages, caption? }`.
  - `inferCollectionName(pageUrl, origin) -> { id, name }`
  - `groupIntoCollections(refs, origin) -> [{ id, name, remoteUrl, assetRefs: [{ remoteUrl, caption }] }]`

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/junkFilter.test.js
import { filterJunkImages, inferCollectionName, groupIntoCollections } from '@/common/import/junkFilter'

describe('filterJunkImages', () => {
  it('drops filename-pattern junk', () => {
    const refs = [
      { remoteUrl: 'https://s.com/logo.png', seenOnPages: 1 },
      { remoteUrl: 'https://s.com/photo-123.jpg', seenOnPages: 1 },
    ]
    const out = filterJunkImages(refs, { totalPages: 1 })
    expect(out.map((r) => r.remoteUrl)).toEqual(['https://s.com/photo-123.jpg'])
  })
  it('drops images repeated across most pages (site chrome) when crawl is large enough', () => {
    const refs = [
      { remoteUrl: 'https://s.com/header.jpg', seenOnPages: 5 },
      { remoteUrl: 'https://s.com/unique.jpg', seenOnPages: 1 },
    ]
    const out = filterJunkImages(refs, { totalPages: 6, repeatRatio: 0.5 })
    expect(out.map((r) => r.remoteUrl)).toEqual(['https://s.com/unique.jpg'])
  })
  it('does not apply the repeat rule for tiny crawls', () => {
    const refs = [{ remoteUrl: 'https://s.com/a.jpg', seenOnPages: 2 }]
    expect(filterJunkImages(refs, { totalPages: 2 })).toHaveLength(1)
  })
})

describe('inferCollectionName', () => {
  it('names a collection from the last path segment', () => {
    expect(inferCollectionName('https://s.com/galleries/big-sur', 'https://s.com'))
      .toEqual({ id: 'galleries/big-sur', name: 'Big Sur' })
  })
  it('uses hostname for the root page', () => {
    expect(inferCollectionName('https://s.com/', 'https://s.com'))
      .toEqual({ id: 'home', name: 's.com' })
  })
})

describe('groupIntoCollections', () => {
  it('groups refs by the page they were found on', () => {
    const refs = [
      { remoteUrl: 'https://s.com/1.jpg', pageUrl: 'https://s.com/travel', caption: null },
      { remoteUrl: 'https://s.com/2.jpg', pageUrl: 'https://s.com/travel', caption: null },
      { remoteUrl: 'https://s.com/3.jpg', pageUrl: 'https://s.com/food', caption: null },
    ]
    const cols = groupIntoCollections(refs, 'https://s.com')
    expect(cols).toHaveLength(2)
    expect(cols.find((c) => c.id === 'travel').assetRefs).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/junkFilter.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/import/junkFilter.js
const JUNK_PATTERNS = /(sprite|favicon|logo|icon|avatar|placeholder|spacer|pixel|1x1|blank)/i

export function filterJunkImages(refs, { totalPages = 1, repeatRatio = 0.5 } = {}) {
  const threshold = totalPages >= 4 ? Math.ceil(totalPages * repeatRatio) : Infinity
  return (refs || []).filter((r) => {
    if (JUNK_PATTERNS.test(r.remoteUrl)) return false
    if ((r.seenOnPages || 1) >= threshold) return false
    return true
  })
}

function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

export function inferCollectionName(pageUrl, origin) {
  try {
    const u = new URL(pageUrl)
    const segs = u.pathname.split('/').filter(Boolean)
    if (!segs.length) return { id: 'home', name: new URL(origin).hostname }
    const raw = segs[segs.length - 1].replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
    return { id: segs.join('/'), name: titleCase(raw) }
  } catch {
    return { id: 'home', name: 'Imported' }
  }
}

export function groupIntoCollections(refs, origin) {
  const map = new Map()
  for (const r of refs || []) {
    const { id, name } = inferCollectionName(r.pageUrl, origin)
    if (!map.has(id)) map.set(id, { id, name, remoteUrl: r.pageUrl, assetRefs: [] })
    map.get(id).assetRefs.push({ remoteUrl: r.remoteUrl, caption: r.caption || null })
  }
  return [...map.values()]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/junkFilter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/junkFilter.js __tests__/import/junkFilter.test.js
git commit -m "feat(import): junk filtering and collection grouping heuristics"
```

---

### Task 4: Generic crawler `discover()`

**Files:**
- Modify: `common/import/adapters/generic.js`
- Test: `__tests__/import/generic.test.js`

**Interfaces:**
- Consumes: `crawlerUtils`, `junkFilter`.
- Produces: `generic.discover(input, { fetchPage, maxPages? }) -> { site: { title, url }, collections: [...] }`. `fetchPage(url) -> Promise<string>` is injectable (defaults to a real HTTP fetch with a browser-like UA); tests inject a fake. BFS same-domain crawl bounded by `maxPages` (default 40).

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/generic.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/generic.test.js`
Expected: FAIL — `generic.discover not implemented yet`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/import/adapters/generic.js
import fetch from 'node-fetch'
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls } from '../crawlerUtils'
import { filterJunkImages, groupIntoCollections } from '../junkFilter'

export const PROVIDER_ID = 'generic'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

async function httpFetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) throw new Error(`non-html: ${type}`)
  return res.text()
}

async function discover(input, { fetchPage = httpFetchPage, maxPages = 40 } = {}) {
  const startUrl = normalizeUrl(input)
  if (!startUrl) throw new Error('Invalid URL')
  const origin = new URL(startUrl).origin

  const visited = new Set()
  const queue = [startUrl]
  const imageMap = new Map() // remoteUrl -> { remoteUrl, pageUrl }
  const seenOnPages = new Map() // remoteUrl -> count
  let siteTitle = null

  while (queue.length && visited.size < maxPages) {
    const pageUrl = queue.shift()
    if (visited.has(pageUrl)) continue
    visited.add(pageUrl)

    let html
    try {
      html = await fetchPage(pageUrl)
    } catch {
      continue
    }
    if (!siteTitle) siteTitle = extractTitle(html)

    const { images, links } = extractImageUrls(html, pageUrl)
    for (const img of images) {
      seenOnPages.set(img, (seenOnPages.get(img) || 0) + 1)
      if (!imageMap.has(img)) imageMap.set(img, { remoteUrl: img, pageUrl })
    }
    for (const link of links) {
      if (isSameDomain(link, origin) && !visited.has(link) && !queue.includes(link)) queue.push(link)
    }
  }

  let refs = [...imageMap.values()].map((v) => ({ ...v, seenOnPages: seenOnPages.get(v.remoteUrl) }))
  refs = filterJunkImages(refs, { totalPages: visited.size })
  const collections = groupIntoCollections(refs, origin)

  return {
    site: { title: siteTitle || new URL(startUrl).hostname, url: startUrl },
    collections,
  }
}

const generic = {
  id: PROVIDER_ID,
  label: 'Website',
  icon: 'globe',
  enabled: true,
  detect() {
    return true
  },
  discover,
}
export default generic
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/generic.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/adapters/generic.js __tests__/import/generic.test.js
git commit -m "feat(import): universal generic crawler discover()"
```

---

### Task 5: SmugMug adapter `discover()`

**Files:**
- Modify: `common/import/adapters/smugmug.js`
- Test: `__tests__/import/smugmug.test.js`

**Interfaces:**
- Consumes: SmugMug API v2 (public read via `SMUGMUG_API_KEY`).
- Produces: `smugmug.discover(input, { fetchJson? }) -> { site, collections }`. `fetchJson(path) -> Promise<object>` injectable; default hits `https://api.smugmug.com{path}?APIKey=...&_accept=application/json`. Extracts the nickname from the URL, lists albums, then images per album. Each album → one collection; each image → `{ remoteUrl, caption }` using the largest available image URL.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/smugmug.test.js
import smugmug from '@/common/import/adapters/smugmug'

function fakeApi() {
  return (path) => {
    if (path.includes('!albums')) {
      return Promise.resolve({
        Response: { Album: [{ AlbumKey: 'AAA', Name: 'Travel', Uris: { AlbumImages: { Uri: '/api/v2/album/AAA!images' } } }] },
      })
    }
    if (path.includes('album/AAA!images')) {
      return Promise.resolve({
        Response: {
          AlbumImage: [
            { Caption: 'Sunset', ArchivedUri: 'https://photos.smugmug.com/AAA/sunset-O.jpg' },
            { Caption: '', ArchivedUri: 'https://photos.smugmug.com/AAA/beach-O.jpg' },
          ],
        },
      })
    }
    return Promise.reject(new Error('unexpected path ' + path))
  }
}

describe('smugmug.discover', () => {
  it('maps albums to collections and images to asset refs', async () => {
    const result = await smugmug.discover('https://joe.smugmug.com', { fetchJson: fakeApi() })
    expect(result.site.title).toBe('joe')
    expect(result.collections).toHaveLength(1)
    const col = result.collections[0]
    expect(col.name).toBe('Travel')
    expect(col.assetRefs).toEqual([
      { remoteUrl: 'https://photos.smugmug.com/AAA/sunset-O.jpg', caption: 'Sunset' },
      { remoteUrl: 'https://photos.smugmug.com/AAA/beach-O.jpg', caption: null },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/smugmug.test.js`
Expected: FAIL — `smugmug.discover not implemented yet`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/import/adapters/smugmug.js
import fetch from 'node-fetch'

export const PROVIDER_ID = 'smugmug'

function normalize(input) {
  const s = String(input || '').trim()
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

function nicknameFromUrl(input) {
  const u = new URL(normalize(input))
  const sub = u.hostname.split('.')[0]
  if (sub && sub !== 'www' && u.hostname.endsWith('smugmug.com')) return sub
  const seg = u.pathname.split('/').filter(Boolean)[0]
  return seg || sub
}

async function httpFetchJson(path) {
  const key = process.env.SMUGMUG_API_KEY
  if (!key) throw new Error('SMUGMUG_API_KEY not configured')
  const sep = path.includes('?') ? '&' : '?'
  const url = `https://api.smugmug.com${path}${sep}APIKey=${key}&_accept=application%2Fjson`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`SmugMug HTTP ${res.status}`)
  return res.json()
}

async function discover(input, { fetchJson = httpFetchJson } = {}) {
  const nickname = nicknameFromUrl(input)
  const albumsResp = await fetchJson(`/api/v2/user/${nickname}!albums`)
  const albums = albumsResp?.Response?.Album || []

  const collections = []
  for (const album of albums) {
    const imagesUri = album?.Uris?.AlbumImages?.Uri
    if (!imagesUri) continue
    const imgResp = await fetchJson(imagesUri)
    const images = imgResp?.Response?.AlbumImage || []
    const assetRefs = images
      .map((img) => {
        const remoteUrl = img.ArchivedUri || img.WebUri || null
        if (!remoteUrl) return null
        return { remoteUrl, caption: img.Caption ? String(img.Caption) : null }
      })
      .filter(Boolean)
    if (assetRefs.length) {
      collections.push({ id: album.AlbumKey, name: album.Name || album.AlbumKey, remoteUrl: imagesUri, assetRefs })
    }
  }

  return {
    site: { title: nickname, url: normalize(input) },
    collections,
  }
}

const smugmug = {
  id: PROVIDER_ID,
  label: 'SmugMug',
  icon: 'smugmug',
  enabled: true,
  detect(input) {
    try {
      return /(^|\.)smugmug\.com$/i.test(new URL(normalize(input)).hostname)
    } catch {
      return false
    }
  },
  discover,
}
export default smugmug
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/smugmug.test.js`
Expected: PASS.

- [ ] **Step 5: Manual verification note (no code)**

Live SmugMug shape can drift. Before shipping, do one manual `discover()` against a real public SmugMug URL with a real `SMUGMUG_API_KEY` and confirm album/image fields (`ArchivedUri`, `Uris.AlbumImages.Uri`). Adjust field access if the live payload differs. This is a manual step, not a unit test.

- [ ] **Step 6: Commit**

```bash
git add common/import/adapters/smugmug.js __tests__/import/smugmug.test.js
git commit -m "feat(import): SmugMug API v2 discover()"
```

---

### Task 6: Extract shared `storeImageBuffer` + refactor upload-file

**Files:**
- Create: `common/storeImage.js`
- Modify: `pages/api/admin/upload-file.js` (use the new helper)
- Test: `__tests__/import/storeImage.test.js`

**Interfaces:**
- Consumes: `common/gcsClient` (`s3`, `BUCKET`, `PUBLIC_URL`), `sharp`, existing path helpers already used by `upload-file.js` (`getUserPhotoPath`, `getUserPhotosPrefix`).
- Produces: `storeImageBuffer(userId, { buffer, filename, contentType, folder }) -> Promise<{ gcsUrl, objectPath, width, height }>` — uploads original + generates 600px thumbnail (thumbnail failure non-fatal). Identical behavior to the current `upload-file` handler body.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/storeImage.test.js
import { jest } from '@jest/globals'

const send = jest.fn().mockResolvedValue({})
jest.mock('@/common/gcsClient', () => ({
  s3: { send },
  BUCKET: 'test-bucket',
  PUBLIC_URL: 'https://cdn.test',
}))

const { storeImageBuffer } = await import('@/common/storeImage')
const sharp = (await import('sharp')).default

describe('storeImageBuffer', () => {
  beforeEach(() => send.mockClear())

  it('uploads original + thumbnail and returns url/dimensions', async () => {
    const buffer = await sharp({
      create: { width: 20, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } },
    }).jpeg().toBuffer()

    const out = await storeImageBuffer('user123', {
      buffer,
      filename: 'my photo.jpg',
      contentType: 'image/jpeg',
      folder: 'photos/import',
    })

    expect(out.objectPath).toBe('users/user123/photos/import/my_photo.jpg')
    expect(out.gcsUrl).toBe('https://cdn.test/users/user123/photos/import/my_photo.jpg')
    expect(out.width).toBe(20)
    expect(out.height).toBe(10)
    // original + thumbnail = 2 puts
    expect(send).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/storeImage.test.js`
Expected: FAIL — cannot find module `@/common/storeImage`.

- [ ] **Step 3: Write minimal implementation**

Copy the storage body currently inside `pages/api/admin/upload-file.js` into the helper. Read `upload-file.js` first and match its exact imports (`PutObjectCommand`, the key resolver `resolveUploadKey`, and path helpers). The helper:

```javascript
// common/storeImage.js
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET, PUBLIC_URL } from './gcsClient'
import { getUserPhotoPath, getUserPhotosPrefix } from './userPaths' // match upload-file.js's import

function resolveUploadKey(userId, filename, folder) {
  const safeName = String(filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const normalizedFolder = (folder || '').replace(/^\/|\/$/g, '')
  const userPhotosPrefix = getUserPhotosPrefix(userId).replace(/\/$/, '')
  if (!normalizedFolder) return getUserPhotoPath(userId, `library/${safeName}`)
  if (normalizedFolder.startsWith(`${userPhotosPrefix}/`)) return `${normalizedFolder}/${safeName}`
  if (normalizedFolder.startsWith('photos/')) {
    return `${userPhotosPrefix}/${normalizedFolder.slice('photos/'.length)}/${safeName}`
  }
  return `${userPhotosPrefix}/${normalizedFolder}/${safeName}`
}

export async function storeImageBuffer(userId, { buffer, filename, contentType, folder }) {
  const key = resolveUploadKey(userId, filename, folder)
  const thumbKey = key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }))

  let width = null
  let height = null
  try {
    const img = sharp(buffer)
    const meta = await img.metadata()
    width = meta.width
    height = meta.height
    const thumb = await img.resize(600, null, { withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: thumbKey, Body: thumb, ContentType: 'image/jpeg' }))
  } catch {
    // thumbnail failure is non-fatal
  }

  return { gcsUrl: `${PUBLIC_URL}/${key}`, objectPath: key, width, height }
}
```

> Note for implementer: `getUserPhotoPath`/`getUserPhotosPrefix` and `resolveUploadKey` currently live inside/next to `upload-file.js`. Read that file to confirm the exact module path for the path helpers, and import them from the same place here. If `resolveUploadKey` is currently a local function in `upload-file.js`, move it into `common/storeImage.js` (as above) so both callers share it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/storeImage.test.js`
Expected: PASS.

- [ ] **Step 5: Refactor `upload-file.js` to use the helper**

Replace the inline storage/thumbnail block in `pages/api/admin/upload-file.js` with:

```javascript
import { storeImageBuffer } from '@/common/storeImage'
// ...inside handler, after buffering the request stream:
const result = await storeImageBuffer(user.id, {
  buffer,
  filename,
  contentType,
  folder,
})
return res.status(200).json(result)
```

- [ ] **Step 6: Verify the full suite still passes (no regression in upload)**

Run: `npx jest`
Expected: PASS (all existing tests green).

- [ ] **Step 7: Commit**

```bash
git add common/storeImage.js pages/api/admin/upload-file.js __tests__/import/storeImage.test.js
git commit -m "refactor(upload): extract shared storeImageBuffer; reuse in upload-file"
```

---

### Task 7: Import core — batch id, imported-asset factory, dedupe

**Files:**
- Create: `common/import/importCore.js`
- Test: `__tests__/import/importCore.test.js`

**Interfaces:**
- Consumes: `createAssetIdFromUrl` from `common/adminConfig`.
- Produces:
  - `newImportBatchId(seed) -> string` — deterministic id from a caller-provided seed (no `Date.now()`/`Math.random()` inside; the caller passes a timestamp/label).
  - `buildImportedAsset({ url, width, height, provider, sourceUrl, label, externalCollectionId, importBatchId, caption, now }) -> assetRecord` — partial asset with `source.type="import"`, populated `source.*`, `assetId` from the stored `url`, orientation/aspectRatio computed. Matches the seeding shape used by `AdminLibrary.handleUploaded`.
  - `existingSourceUrls(config) -> Set<string>` — all `source.sourceUrl` values already present in `config.assets`.
  - `dedupeRefs(assetRefs, existingUrls) -> { fresh, skipped }` — partitions incoming refs by whether their `remoteUrl` is already imported.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/importCore.test.js
import { newImportBatchId, buildImportedAsset, existingSourceUrls, dedupeRefs } from '@/common/import/importCore'

describe('newImportBatchId', () => {
  it('is deterministic for a given seed', () => {
    expect(newImportBatchId('2026-07-08T00:00:00Z|smugmug')).toBe(newImportBatchId('2026-07-08T00:00:00Z|smugmug'))
    expect(newImportBatchId('a')).not.toBe(newImportBatchId('b'))
  })
})

describe('buildImportedAsset', () => {
  it('produces a source-tagged asset record', () => {
    const asset = buildImportedAsset({
      url: 'https://cdn.test/users/u/photos/import/one.jpg',
      width: 2000,
      height: 1000,
      provider: 'smugmug',
      sourceUrl: 'https://photos.smugmug.com/AAA/one-O.jpg',
      label: 'joe',
      externalCollectionId: 'AAA',
      importBatchId: 'imp_x',
      caption: 'Sunset',
      now: '2026-07-08T00:00:00Z',
    })
    expect(asset.assetId).toMatch(/^ast_/)
    expect(asset.publicUrl).toBe('https://cdn.test/users/u/photos/import/one.jpg')
    expect(asset.orientation).toBe('landscape')
    expect(asset.aspectRatio).toBe(2)
    expect(asset.caption).toBe('Sunset')
    expect(asset.source).toMatchObject({
      type: 'import',
      provider: 'smugmug',
      label: 'joe',
      sourceUrl: 'https://photos.smugmug.com/AAA/one-O.jpg',
      externalCollectionId: 'AAA',
      importBatchId: 'imp_x',
      lastSyncedAt: '2026-07-08T00:00:00Z',
    })
  })
})

describe('dedupe', () => {
  it('collects existing source urls and partitions incoming refs', () => {
    const config = {
      assets: { ast_1: { source: { sourceUrl: 'https://remote/a.jpg' } } },
    }
    const urls = existingSourceUrls(config)
    expect(urls.has('https://remote/a.jpg')).toBe(true)
    const { fresh, skipped } = dedupeRefs(
      [{ remoteUrl: 'https://remote/a.jpg' }, { remoteUrl: 'https://remote/b.jpg' }],
      urls
    )
    expect(fresh.map((r) => r.remoteUrl)).toEqual(['https://remote/b.jpg'])
    expect(skipped).toEqual(['https://remote/a.jpg'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/importCore.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/import/importCore.js
import { createAssetIdFromUrl } from '@/common/adminConfig'

function stableHash(input) {
  let hash = 2166136261
  const s = String(input || '')
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

export function newImportBatchId(seed) {
  return `imp_${stableHash(seed)}`
}

export function buildImportedAsset({
  url,
  width,
  height,
  provider,
  sourceUrl,
  label,
  externalCollectionId,
  importBatchId,
  caption,
  now,
}) {
  const ratio = width && height ? width / height : null
  return {
    assetId: createAssetIdFromUrl(url),
    publicUrl: url,
    caption: caption || '',
    createdAt: now,
    updatedAt: now,
    ...(width && height
      ? {
          width,
          height,
          aspectRatio: Number(ratio.toFixed(4)),
          orientation: ratio === 1 ? 'square' : ratio > 1 ? 'landscape' : 'portrait',
        }
      : {}),
    source: {
      type: 'import',
      provider,
      label: label ?? null,
      sourceUrl: sourceUrl ?? null,
      importBatchId: importBatchId ?? null,
      externalAssetId: null,
      externalCollectionId: externalCollectionId ?? null,
      syncMode: null,
      lastSyncedAt: now,
    },
  }
}

export function existingSourceUrls(config) {
  const set = new Set()
  for (const asset of Object.values(config?.assets || {})) {
    const u = asset?.source?.sourceUrl
    if (u) set.add(u)
  }
  return set
}

export function dedupeRefs(assetRefs, existingUrls) {
  const fresh = []
  const skipped = []
  for (const ref of assetRefs || []) {
    if (existingUrls.has(ref.remoteUrl)) skipped.push(ref.remoteUrl)
    else fresh.push(ref)
  }
  return { fresh, skipped }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/importCore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/importCore.js __tests__/import/importCore.test.js
git commit -m "feat(import): batch id, imported-asset factory, and dedupe helpers"
```

---

### Task 8: `POST /api/admin/import/discover` route

**Files:**
- Create: `pages/api/admin/import/discover.js`
- Test: `__tests__/import/discover.route.test.js`

**Interfaces:**
- Consumes: `withAuth`, `detectAdapter`/`getAdapter`.
- Produces: `POST` body `{ input, provider? }` → `200 { provider, site, collections, totalAssets }`. Errors: `400` invalid/empty input; `422` when discovery finds zero images; `502` on adapter failure with a friendly `message`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/discover.route.test.js
import { jest } from '@jest/globals'

jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

const discoverMock = jest.fn()
jest.mock('@/common/import/adapters', () => ({
  PROVIDERS: { SMUGMUG: 'smugmug', GENERIC: 'generic' },
  detectAdapter: () => ({ id: 'generic', discover: discoverMock }),
  getAdapter: () => ({ id: 'generic', discover: discoverMock }),
}))

const handler = (await import('@/pages/api/admin/import/discover')).default

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('POST /api/admin/import/discover', () => {
  beforeEach(() => discoverMock.mockReset())

  it('400 on empty input', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns the discovery tree with a total count', async () => {
    discoverMock.mockResolvedValue({
      site: { title: 'Joe', url: 'https://joe.com/' },
      collections: [{ id: 'travel', name: 'Travel', assetRefs: [{ remoteUrl: 'x' }, { remoteUrl: 'y' }] }],
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'joe.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ provider: 'generic', totalAssets: 2 }))
  })

  it('422 when nothing found', async () => {
    discoverMock.mockResolvedValue({ site: { title: 'x', url: 'x' }, collections: [] })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'joe.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(422)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/discover.route.test.js`
Expected: FAIL — cannot find module `@/pages/api/admin/import/discover`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// pages/api/admin/import/discover.js
import { withAuth } from '@/common/withAuth'
import { detectAdapter, getAdapter } from '@/common/import/adapters'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { input, provider } = req.body || {}
  if (!input || !String(input).trim()) {
    return res.status(400).json({ error: 'A link is required', message: 'Paste a link to your photos.' })
  }

  const adapter = provider ? getAdapter(provider) : detectAdapter(input)
  if (!adapter || !adapter.enabled) {
    return res.status(400).json({ error: 'Unsupported source' })
  }

  let result
  try {
    result = await adapter.discover(input)
  } catch (err) {
    return res.status(502).json({
      error: 'discovery_failed',
      message: "We couldn't read that link. Try a different URL, or upload your photos manually.",
      detail: String(err?.message || err),
    })
  }

  const totalAssets = (result.collections || []).reduce((n, c) => n + (c.assetRefs?.length || 0), 0)
  if (totalAssets === 0) {
    return res.status(422).json({
      error: 'no_images',
      message: "We didn't find any photos at that link. Try a direct gallery URL, or upload manually.",
    })
  }

  return res.status(200).json({ provider: adapter.id, site: result.site, collections: result.collections, totalAssets })
}

export default withAuth(handler)
```

> Note: confirm the auth wrapper's real module path (the exploration showed `withAuth` used across `pages/api/admin/*`). If it lives at `@/common/withAuth`, keep as-is; otherwise adjust the import and the test mock path to match.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/discover.route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/import/discover.js __tests__/import/discover.route.test.js
git commit -m "feat(import): discover API route"
```

---

### Task 9: `POST /api/admin/import/fetch-batch` route

**Files:**
- Create: `pages/api/admin/import/fetch-batch.js`
- Test: `__tests__/import/fetchBatch.route.test.js`

**Interfaces:**
- Consumes: `withAuth`, `node-fetch`, `storeImageBuffer`, `downloadJSON` (to read existing config for dedupe), `buildImportedAsset`/`existingSourceUrls`/`dedupeRefs`.
- Produces: `POST` body `{ importBatchId, provider, label, assetRefs: [{ remoteUrl, caption, externalCollectionId }] }` → `200 { imported: assetRecord[], failed: [{ remoteUrl, reason }], skipped: string[] }`. Never throws on a single asset; each failure is captured. Does **not** write the library config — the client merges + PUTs (matching the existing upload flow).

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/fetchBatch.route.test.js
import { jest } from '@jest/globals'

jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))
jest.mock('@/common/gcsClient', () => ({ downloadJSON: jest.fn().mockResolvedValue({ assets: {} }) }))

const storeMock = jest.fn()
jest.mock('@/common/storeImage', () => ({ storeImageBuffer: storeMock }))

const fetchMock = jest.fn()
jest.mock('node-fetch', () => ({ __esModule: true, default: (...a) => fetchMock(...a) }))

const handler = (await import('@/pages/api/admin/import/fetch-batch')).default

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}
function okImage() {
  return {
    ok: true,
    headers: { get: () => 'image/jpeg' },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }
}

describe('POST /api/admin/import/fetch-batch', () => {
  beforeEach(() => {
    storeMock.mockReset()
    fetchMock.mockReset()
  })

  it('downloads, stores, and returns imported assets; isolates failures', async () => {
    fetchMock.mockResolvedValueOnce(okImage()).mockRejectedValueOnce(new Error('boom'))
    storeMock.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/a.jpg', width: 100, height: 50 })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          importBatchId: 'imp_x',
          provider: 'generic',
          label: 'joe.com',
          assetRefs: [
            { remoteUrl: 'https://remote/a.jpg', caption: 'A' },
            { remoteUrl: 'https://remote/b.jpg' },
          ],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(1)
    expect(payload.imported[0].source.provider).toBe('generic')
    expect(payload.failed).toEqual([{ remoteUrl: 'https://remote/b.jpg', reason: 'boom' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/fetchBatch.route.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```javascript
// pages/api/admin/import/fetch-batch.js
import fetch from 'node-fetch'
import { withAuth } from '@/common/withAuth'
import { downloadJSON } from '@/common/gcsClient'
import { storeImageBuffer } from '@/common/storeImage'
import { buildImportedAsset, existingSourceUrls, dedupeRefs } from '@/common/import/importCore'

function configKey(userId) {
  return `users/${userId}/library-config.json`
}

function filenameFromUrl(remoteUrl) {
  try {
    const p = new URL(remoteUrl).pathname.split('/').filter(Boolean).pop() || 'image.jpg'
    return /\.[a-z0-9]+$/i.test(p) ? p : `${p}.jpg`
  } catch {
    return 'image.jpg'
  }
}

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { importBatchId, provider, label, assetRefs } = req.body || {}
  if (!Array.isArray(assetRefs) || !provider) {
    return res.status(400).json({ error: 'provider and assetRefs are required' })
  }

  let existing = new Set()
  try {
    existing = existingSourceUrls(await downloadJSON(configKey(user.id)))
  } catch {
    // no config yet — nothing to dedupe against
  }
  const { fresh, skipped } = dedupeRefs(assetRefs, existing)

  const now = new Date().toISOString()
  const imported = []
  const failed = []

  for (const ref of fresh) {
    try {
      const resp = await fetch(ref.remoteUrl, { redirect: 'follow' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const contentType = resp.headers.get('content-type') || 'image/jpeg'
      if (!contentType.startsWith('image/')) throw new Error(`not an image (${contentType})`)
      const buffer = Buffer.from(await resp.arrayBuffer())

      const stored = await storeImageBuffer(user.id, {
        buffer,
        filename: filenameFromUrl(ref.remoteUrl),
        contentType,
        folder: 'photos/import',
      })

      imported.push(
        buildImportedAsset({
          url: stored.gcsUrl,
          width: stored.width,
          height: stored.height,
          provider,
          sourceUrl: ref.remoteUrl,
          label: label ?? null,
          externalCollectionId: ref.externalCollectionId ?? null,
          importBatchId: importBatchId ?? null,
          caption: ref.caption ?? '',
          now,
        })
      )
    } catch (err) {
      failed.push({ remoteUrl: ref.remoteUrl, reason: String(err?.message || err) })
    }
  }

  return res.status(200).json({ imported, failed, skipped })
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/fetchBatch.route.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS (all green).

- [ ] **Step 6: Commit**

```bash
git add pages/api/admin/import/fetch-batch.js __tests__/import/fetchBatch.route.test.js
git commit -m "feat(import): fetch-batch API route (download, store, source-tag)"
```

---

### Task 10: Environment + docs wiring

**Files:**
- Modify: `.env.local.example` (or the project's env template, if present)
- Modify: `docs/designs/photohub-platform-design.md` OR `CLAUDE.md` (one-line note pointing at the import engine) — pick whichever the repo already uses for such notes; do not create a new doc.

**Interfaces:**
- Consumes: nothing.
- Produces: documented `SMUGMUG_API_KEY` requirement.

- [ ] **Step 1: Add the env var to the example template (if one exists)**

Check for an env example file:

Run: `ls .env*.example 2>/dev/null; ls .env.example 2>/dev/null`

If one exists, add:

```
# SmugMug import (free API key from https://api.smugmug.com/api/developer/apply)
SMUGMUG_API_KEY=
```

If no example file exists, skip the file edit and instead note the variable in the "What Needs Building" section of `docs/designs/photohub-platform-design.md`.

- [ ] **Step 2: Verify nothing broke**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(import): document SMUGMUG_API_KEY requirement"
```

---

## Self-Review

**Spec coverage (against `2026-07-08-web-import-onboarding-design.md`):**
- §4.1 adapter contract → Task 1. ✅
- §4.2 auto-detect → Task 1 (`detectAdapter`). ✅
- §4.3 execution model: discover route → Task 8; batched fetch reusing upload pipeline → Tasks 6 + 9. ✅
- §4.4 generic crawler (static + og:image, bounded, junk filter, gallery inference) → Tasks 2–4. **Headless fallback is intentionally deferred to Plan 1.5** (noted in handoff). ✅ (partial by design)
- §4.5 data model (source population, Sets, importBatchId, dedupe) → Task 7 (`buildImportedAsset`, dedupe) + Task 9 (applies them). **Set creation from collections is a client responsibility** consumed by the UI plan (Plan 2) — the engine returns `collections` with `externalCollectionId` carried on each imported asset, which is what Set creation needs. ✅
- §5 API routes → Tasks 8, 9. ✅
- §9 deferred (Instagram, SmugMug OAuth, auto-build) → not implemented; Instagram adapter slot intentionally absent from the enabled registry. ✅

**Placeholder scan:** No TBD/TODO. Every code step has complete code. The two "Note to implementer" callouts (Task 6 path-helper import, Task 8 auth import path) are verification instructions with concrete fallbacks, not placeholders. ✅

**Type consistency:** `discover()` returns `{ site, collections }` everywhere (Tasks 4, 5, 8). `assetRefs` items are `{ remoteUrl, caption }` from adapters (Tasks 4, 5) and consumed as such in Task 9. `buildImportedAsset` field names match `AdminLibrary.handleUploaded` seeding + the `source` shape from `adminConfig` (Task 7). `storeImageBuffer` return `{ gcsUrl, objectPath, width, height }` matches `upload-file`'s contract and Task 9's usage. ✅

**Deferred-to-later-plans (not gaps):** Set creation, onboarding UI, sign-in interstitial removal, Library Source filter, and the empty-state hero all belong to Plans 2–4 (UI). The headless fetcher is Plan 1.5. This plan delivers a working, tested engine callable by those plans.
