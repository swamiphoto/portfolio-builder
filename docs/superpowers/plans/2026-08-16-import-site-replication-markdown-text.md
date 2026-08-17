# Import Site Replication + Markdown Text Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importing a site URL auto-creates the equivalent Sepia pages (galleries, about, contact) with well-composed blocks, at original resolution; the text block gains an opt-in markdown mode with a slide-out editor.

**Architecture:** Adapters gain an optional `siteMap` in their `discover()` result (page classification is deterministic heuristics — no AI). A pure composer (`common/import/composer.js`) turns siteMap + imported assets into page configs, merged into `site-config.json` from the import `onComplete` handlers. Markdown is a hand-rolled safe parser (`common/markdown.js`, no new deps, no HTML passthrough) rendered through the theme's existing text variant classes; editing happens in a right-side drawer modeled on `PackagesDrawer`.

**Tech Stack:** Next.js 14 pages router, plain JS, cheerio (already a dep), jest 30 + @testing-library/react (tests in `__tests__/`, run with `npx jest <path>`).

**Spec:** `docs/designs/2026-08-16-import-site-replication-markdown-text-design.md`

## Global Constraints

- Node >= 24; run tests with `npx jest __tests__/<file> -t "<name>"` or a whole file with `npx jest __tests__/<file>`.
- NEVER run `next build` in this workspace — a live `next dev` runs on port 3000 and a build clobbers `.next`.
- No new npm dependencies. The markdown parser is hand-rolled; no raw HTML may pass through it (build React elements, never `dangerouslySetInnerHTML`).
- Import alias `@/` maps to repo root (jest + next both resolve it).
- All copy follows real-prose voice (no fragment stacks, no "Not X. Just Y.").
- Commit messages: conventional style (`feat:`, `fix:`, `test:`, `docs:`), each ending with the line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `defaultBlock` lives in `common/blocks.js`; `defaultPage`/`seedBlocksForTemplate`/`titleForTemplate` in `common/siteConfig.js`; block shapes: photo `{type:'photo', imageUrl}`, photos `{type:'photos', images:[], imageUrls:[], layout:'stacked'|'masonry'}`, text `{type:'text', content}`, contact `{type:'contact', heading, subheading, buttonText}`.

---

### Task 1: Page-content extraction in crawlerUtils

**Files:**
- Modify: `common/import/crawlerUtils.js`
- Test: `__tests__/import/crawlerUtils.test.js` (create)

**Interfaces:**
- Consumes: cheerio (already imported in the file).
- Produces: `extractPageContent(html) -> { text, wordCount, hasForm, hasMailto }` and `extractNavLinks(html, baseUrl) -> [{ href, label }]`. Task 3 calls both from the generic adapter.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/import/crawlerUtils.test.js
import { extractPageContent, extractNavLinks } from '@/common/import/crawlerUtils'

describe('extractPageContent', () => {
  it('extracts prose paragraphs, drops nav/header/footer/script chrome', () => {
    const html = `<html><head><script>var x=1</script></head><body>
      <nav><a href="/about">About</a></nav>
      <main><p>I am a photographer based in Austin.</p><p>I shoot landscapes and portraits.</p></main>
      <footer>© 2026</footer></body></html>`
    const r = extractPageContent(html)
    expect(r.text).toBe('I am a photographer based in Austin.\n\nI shoot landscapes and portraits.')
    expect(r.wordCount).toBe(13)
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/import/crawlerUtils.test.js`
Expected: FAIL — `extractPageContent` is not exported.

- [ ] **Step 3: Implement in crawlerUtils.js**

Append to `common/import/crawlerUtils.js`:

```js
// Prose + signals for page classification. Chrome elements (nav/header/footer)
// and non-content tags are removed so wordCount reflects actual page copy.
export function extractPageContent(html) {
  const $ = cheerio.load(String(html || ''))
  const hasForm = $('form').length > 0
  const hasMailto = $('a[href^="mailto:"]').length > 0
  $('script, style, noscript, nav, header, footer, svg').remove()
  const scope = $('main').length ? $('main') : $('body')
  const paras = []
  scope.find('p, h1, h2, h3, blockquote, li').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t) paras.push(t)
  })
  let text = paras.join('\n\n')
  if (!text) text = scope.text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
  const wordCount = text ? text.split(/\s+/).length : 0
  return { text, wordCount, hasForm, hasMailto }
}

export function extractNavLinks(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  const out = []
  const seen = new Set()
  $('header a[href], nav a[href]').each((_, el) => {
    const resolved = safeResolve($(el).attr('href'), baseUrl)
    if (!resolved) return
    const href = resolved.split('#')[0]
    if (seen.has(href)) return
    seen.add(href)
    out.push({ href, label: $(el).text().replace(/\s+/g, ' ').trim() })
  })
  return out
}
```

Note: `safeResolve` already exists at the top of the file.

- [ ] **Step 4: Run tests to verify they pass** — `npx jest __tests__/import/crawlerUtils.test.js`. If the first test's exact `text`/`wordCount` differ because of cheerio quirks, fix the implementation (not the assertion's intent: two paragraphs joined by a blank line).

- [ ] **Step 5: Commit** — `git add common/import/crawlerUtils.js __tests__/import/crawlerUtils.test.js && git commit -m "feat(import): extract page prose and nav links for classification"`

---

### Task 2: Page classifier + site-map builder

**Files:**
- Create: `common/import/siteMap.js`
- Modify: `common/import/importCore.js` (export `stableHash`, move `slugify` here)
- Modify: `common/import/importClient.js` (re-export `slugify` from importCore)
- Test: `__tests__/import/siteMap.test.js` (create)

**Interfaces:**
- Consumes: `inferCollectionName(pageUrl, origin)` from `@/common/import/junkFilter` (returns `{id, name}`); `slugify` (moving to importCore).
- Produces:
  - `classifyPage({ url, navLabel, wordCount, imageCount, hasForm, hasMailto }) -> 'gallery'|'about'|'contact'|'other'`
  - `buildSiteMap({ pageRecords, origin, navLinks }) -> { pages: [{ kind, title, slug, navOrder, sourceUrl, textContent, collectionId }] }` where `pageRecords` is `[{ url, title, wordCount, imageCount, hasForm, hasMailto, text }]`. Tasks 3, 4, 6 depend on this page shape.

- [ ] **Step 1: Move `slugify` to importCore, re-export from importClient**

In `common/import/importCore.js` add (and export `stableHash` while there — Task 6 needs it for deterministic ids):

```js
export { stableHash }  // change `function stableHash` declaration to stay as-is; add export

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
```

In `common/import/importClient.js` delete the local `slugify` and replace with `export { slugify } from '@/common/import/importCore'` (keep `newImportBatchId` import as is). Run `npx jest __tests__/import/importClient.test.js` — must still pass.

- [ ] **Step 2: Write the failing tests**

```js
// __tests__/import/siteMap.test.js
import { classifyPage, buildSiteMap } from '@/common/import/siteMap'

describe('classifyPage', () => {
  it('classifies by slug/nav label first', () => {
    expect(classifyPage({ url: 'https://x.com/about', wordCount: 20, imageCount: 10 })).toBe('about')
    expect(classifyPage({ url: 'https://x.com/contact-me', wordCount: 10, imageCount: 0 })).toBe('contact')
    expect(classifyPage({ url: 'https://x.com/p1', navLabel: 'Bio', wordCount: 200, imageCount: 1 })).toBe('about')
  })
  it('classifies by composition when slug is neutral', () => {
    expect(classifyPage({ url: 'https://x.com/landscapes', wordCount: 30, imageCount: 24 })).toBe('gallery')
    expect(classifyPage({ url: 'https://x.com/story', wordCount: 400, imageCount: 1 })).toBe('about')
    expect(classifyPage({ url: 'https://x.com/hire', wordCount: 40, imageCount: 0, hasForm: true })).toBe('contact')
    expect(classifyPage({ url: 'https://x.com/misc', wordCount: 40, imageCount: 1 })).toBe('other')
  })
})

describe('buildSiteMap', () => {
  const records = [
    { url: 'https://x.com/', title: 'Jane Doe Photography', wordCount: 10, imageCount: 12, text: '' },
    { url: 'https://x.com/portraits', title: 'Portraits — Jane', wordCount: 8, imageCount: 30, text: '' },
    { url: 'https://x.com/about', title: 'About — Jane', wordCount: 220, imageCount: 1, text: 'I am Jane.\n\nI shoot people.' },
    { url: 'https://x.com/contact', title: 'Contact', wordCount: 30, imageCount: 0, hasForm: true, text: '' },
  ]
  const navLinks = [
    { href: 'https://x.com/portraits', label: 'Portraits' },
    { href: 'https://x.com/about', label: 'About' },
    { href: 'https://x.com/contact', label: 'Contact' },
  ]
  it('builds classified pages with nav order and collection ids', () => {
    const { pages } = buildSiteMap({ pageRecords: records, origin: 'https://x.com', navLinks })
    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]))
    expect(bySlug['portraits']).toMatchObject({ kind: 'gallery', title: 'Portraits', navOrder: 0, collectionId: 'portraits' })
    expect(bySlug['about']).toMatchObject({ kind: 'about', navOrder: 1, textContent: 'I am Jane.\n\nI shoot people.' })
    expect(bySlug['contact']).toMatchObject({ kind: 'contact', navOrder: 2 })
    // root gallery page comes home-titled, after nav-ordered pages
    expect(bySlug['home']).toMatchObject({ kind: 'gallery', title: 'Home', navOrder: null, collectionId: 'home' })
  })
  it('prefers the nav label over the <title> tag for page titles', () => {
    const { pages } = buildSiteMap({ pageRecords: records, origin: 'https://x.com', navLinks })
    expect(pages.find((p) => p.slug === 'portraits').title).toBe('Portraits')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail** — `npx jest __tests__/import/siteMap.test.js` → module not found.

- [ ] **Step 4: Implement `common/import/siteMap.js`**

```js
import { inferCollectionName } from './junkFilter'
import { slugify } from './importCore'

const ABOUT_RE = /(^|\b)(about|bio|info)(\b|$)/i
const CONTACT_RE = /(^|\b)(contact|hire|book|booking)(\b|$)/i

function lastSegment(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

// Deterministic, ordered rules — no AI. Slug/nav intent wins over composition.
export function classifyPage({ url, navLabel, wordCount = 0, imageCount = 0, hasForm = false, hasMailto = false }) {
  const seg = lastSegment(url).replace(/[-_]+/g, ' ')
  const label = String(navLabel || '')
  if (ABOUT_RE.test(seg) || ABOUT_RE.test(label)) return 'about'
  if (CONTACT_RE.test(seg) || CONTACT_RE.test(label)) return 'contact'
  if ((hasForm || hasMailto) && wordCount < 150 && imageCount <= 2) return 'contact'
  if (imageCount >= 8 && wordCount < 200) return 'gallery'
  if (wordCount >= 150 && imageCount <= 2) return 'about'
  if (imageCount >= 4) return 'gallery'
  return 'other'
}

// Title preference: nav label → cleaned collection name → <title> tag.
export function buildSiteMap({ pageRecords, origin, navLinks = [] }) {
  const navByHref = new Map()
  navLinks.forEach((l, i) => {
    const href = l.href.replace(/\/+$/, '')
    if (!navByHref.has(href)) navByHref.set(href, { order: navByHref.size, label: l.label })
  })
  const pages = []
  for (const rec of pageRecords || []) {
    const nav = navByHref.get(rec.url.replace(/\/+$/, '')) || null
    const kind = classifyPage({ ...rec, navLabel: nav?.label })
    const { id: collectionId, name } = inferCollectionName(rec.url, origin)
    const isRoot = collectionId === 'home'
    const title = isRoot ? 'Home' : nav?.label || name || rec.title || 'Untitled'
    pages.push({
      kind,
      title,
      slug: isRoot ? 'home' : slugify(title) || slugify(collectionId) || 'page',
      navOrder: nav ? nav.order : null,
      sourceUrl: rec.url,
      textContent: kind === 'about' ? rec.text || '' : '',
      collectionId,
    })
  }
  return { pages }
}
```

- [ ] **Step 5: Run tests** — `npx jest __tests__/import/siteMap.test.js` and `npx jest __tests__/import/importClient.test.js`. Expected: PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(import): deterministic page classifier and site-map builder"` (add both source and test files).

---

### Task 3: Generic adapter returns a site map; discover API passes it through

**Files:**
- Modify: `common/import/adapters/generic.js`
- Modify: `pages/api/admin/import/discover.js:45-50`
- Test: `__tests__/import/genericAdapter.test.js` (create; if a generic-adapter test already exists under `__tests__/`, extend it instead)

**Interfaces:**
- Consumes: `extractPageContent`, `extractNavLinks` (Task 1); `buildSiteMap` (Task 2). `discover(input, { fetchPage })` already supports an injected `fetchPage` for tests.
- Produces: `discover()` result gains `siteMap` (or `siteMap: null` in single-page mode). The discover API response gains `siteMap`. Task 9's `summary.siteMap` originates here.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/import/genericAdapter.test.js
import generic from '@/common/import/adapters/generic'

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
```

- [ ] **Step 2: Run to verify it fails** — `npx jest __tests__/import/genericAdapter.test.js` → `siteMap` undefined.

- [ ] **Step 3: Implement in generic.js**

In the BFS loop, after `const { images, links } = extractImageUrls(html, pageUrl)`, collect a page record and (on the first page) nav links:

```js
import { extractPageContent, extractNavLinks } from '../crawlerUtils'
import { buildSiteMap } from '../siteMap'
```

Inside `discover`, before the loop: `const pageRecords = []` and `let navLinks = null`. Inside the loop after images are collected:

```js
    const content = extractPageContent(html)
    pageRecords.push({
      url: pageUrl,
      title: extractTitle(html),
      wordCount: content.wordCount,
      imageCount: images.length,
      hasForm: content.hasForm,
      hasMailto: content.hasMailto,
      text: content.text,
    })
    if (navLinks === null) navLinks = extractNavLinks(html, pageUrl)
```

And in the return:

```js
  return {
    site: { title: siteTitle || new URL(startUrl).hostname, url: startUrl },
    collections,
    siteMap: singlePage ? null : buildSiteMap({ pageRecords, origin, navLinks: navLinks || [] }),
  }
```

In `pages/api/admin/import/discover.js`, add `siteMap: result.siteMap || null,` to the 200 response object.

- [ ] **Step 4: Run tests** — `npx jest __tests__/import/genericAdapter.test.js` → PASS. Also `npx jest __tests__/import` (whole dir) to catch regressions.

- [ ] **Step 5: Commit** — `git commit -m "feat(import): generic adapter emits classified site map"`

---

### Task 4: SmugMug adapter site map

**Files:**
- Modify: `common/import/adapters/smugmug.js:51-54`
- Test: `__tests__/import/smugmugAdapter.test.js` (create, or extend the existing SmugMug test if one exists under `__tests__/`)

**Interfaces:**
- Consumes: `slugify` from `@/common/import/importCore`. `discover(input, { fetchJson })` supports injection.
- Produces: SmugMug `discover()` result gains `siteMap` with one `kind:'gallery'` page per album, `collectionId` = `AlbumKey`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/import/smugmugAdapter.test.js
import smugmug from '@/common/import/adapters/smugmug'

const fetchJson = async (path) => {
  if (path.includes('!albums')) {
    return { Response: { Album: [
      { AlbumKey: 'K1', Name: 'Landscapes', Uris: { AlbumImages: { Uri: '/img/K1' } } },
      { AlbumKey: 'K2', Name: 'City Nights', Uris: { AlbumImages: { Uri: '/img/K2' } } },
    ] } }
  }
  return { Response: { AlbumImage: [{ ArchivedUri: `https://smu.gs${path}/a.jpg`, Caption: '' }] } }
}

it('derives a gallery site map from the album tree', async () => {
  const result = await smugmug.discover('https://jane.smugmug.com', { fetchJson })
  expect(result.siteMap.pages).toEqual([
    { kind: 'gallery', title: 'Landscapes', slug: 'landscapes', navOrder: 0, sourceUrl: '/img/K1', textContent: '', collectionId: 'K1' },
    { kind: 'gallery', title: 'City Nights', slug: 'city-nights', navOrder: 1, sourceUrl: '/img/K2', textContent: '', collectionId: 'K2' },
  ])
})
```

- [ ] **Step 2: Run to verify it fails** — `npx jest __tests__/import/smugmugAdapter.test.js`.

- [ ] **Step 3: Implement** — in `smugmug.js` add `import { slugify } from '../importCore'` and change the return of `discover` to:

```js
  return {
    site: { title: nickname, url: normalize(input) },
    collections,
    siteMap: {
      pages: collections.map((c, i) => ({
        kind: 'gallery',
        title: c.name,
        slug: slugify(c.name) || c.id.toLowerCase(),
        navOrder: i,
        sourceUrl: c.remoteUrl,
        textContent: '',
        collectionId: c.id,
      })),
    },
  }
```

- [ ] **Step 4: Run tests** — `npx jest __tests__/import/smugmugAdapter.test.js` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(import): smugmug adapter emits gallery site map from album tree"`

---

### Task 5: Original-resolution URL hunting

**Files:**
- Create: `common/import/originalUrl.js`
- Modify: `pages/api/admin/import/fetch-batch.js:57-70`
- Test: `__tests__/import/originalUrl.test.js` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `originalUrlCandidates(url) -> string[]` (higher-res candidates, best first, excluding the input; empty when no rewrite applies). fetch-batch tries candidates before the discovered URL.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/import/originalUrl.test.js
import { originalUrlCandidates } from '@/common/import/originalUrl'

it('rewrites squarespace CDN urls to format=original', () => {
  expect(originalUrlCandidates('https://images.squarespace-cdn.com/content/abc/photo.jpg?format=1500w'))
    .toEqual(['https://images.squarespace-cdn.com/content/abc/photo.jpg?format=original'])
})
it('strips wordpress size suffixes and -scaled', () => {
  expect(originalUrlCandidates('https://site.com/wp-content/uploads/2024/01/photo-1024x683.jpg'))
    .toEqual(['https://site.com/wp-content/uploads/2024/01/photo.jpg'])
  expect(originalUrlCandidates('https://site.com/wp-content/uploads/photo-scaled.jpg'))
    .toEqual(['https://site.com/wp-content/uploads/photo.jpg'])
})
it('returns no candidates for unrecognized urls', () => {
  expect(originalUrlCandidates('https://cdn.example.com/x/photo.jpg')).toEqual([])
  expect(originalUrlCandidates('not a url')).toEqual([])
})
```

- [ ] **Step 2: Run to verify failure** — `npx jest __tests__/import/originalUrl.test.js`.

- [ ] **Step 3: Implement `common/import/originalUrl.js`**

```js
// Derivative → original URL rewrites for known platforms. Candidates are
// probed by the import fetcher and silently fall back to the discovered URL,
// so a wrong guess costs one failed request, never a failed import.
export function originalUrlCandidates(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return []
  }
  const out = []
  if (/squarespace/i.test(u.hostname)) {
    const orig = new URL(u.toString())
    orig.search = ''
    orig.searchParams.set('format', 'original')
    if (orig.toString() !== url) out.push(orig.toString())
  }
  if (/\/wp-content\/uploads\//.test(u.pathname)) {
    const stripped = u.pathname
      .replace(/-\d{2,4}x\d{2,4}(\.\w+)$/, '$1')
      .replace(/-scaled(\.\w+)$/, '$1')
    if (stripped !== u.pathname) out.push(`${u.origin}${stripped}${u.search}`)
  }
  return out
}
```

- [ ] **Step 4: Run tests** — PASS expected.

- [ ] **Step 5: Wire into fetch-batch**

In `pages/api/admin/import/fetch-batch.js`, add `import { originalUrlCandidates } from '@/common/import/originalUrl'`, then extract the existing fetch-and-validate block into a helper above `handler`, and try candidates first:

```js
async function fetchImage(url) {
  const resp = await safeFetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const contentType = resp.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) throw new Error(`not an image (${contentType})`)
  const len = Number(resp.headers.get('content-length') || 0)
  if (len > MAX_IMPORT_BYTES) throw new Error('image too large')
  return { buffer: Buffer.from(await resp.arrayBuffer()), contentType }
}
```

and inside the `for (const ref of fresh)` loop replace the fetch/validate lines with:

```js
      let fetched = null
      for (const candidate of originalUrlCandidates(ref.remoteUrl)) {
        try {
          fetched = await fetchImage(candidate)
          break
        } catch {
          // candidate guess failed — fall back to the discovered URL
        }
      }
      if (!fetched) fetched = await fetchImage(ref.remoteUrl)
      const { buffer, contentType } = fetched
```

(the rest of the loop — `extractCapture`, `storeImageBuffer`, `buildImportedAsset` — is unchanged and keeps using `ref.remoteUrl` as `sourceUrl` for dedupe stability).

- [ ] **Step 6: Run the whole import test dir** — `npx jest __tests__/import` → PASS.

- [ ] **Step 7: Commit** — `git commit -m "feat(import): probe platform original-resolution urls before fetching"`

---

### Task 6: Layout composer

**Files:**
- Create: `common/import/composer.js`
- Test: `__tests__/import/composer.test.js` (create)

**Interfaces:**
- Consumes: `defaultPage` from `@/common/siteConfig`, `defaultBlock` from `@/common/blocks`, `stableHash` + `slugify` from `@/common/import/importCore`, siteMap page shape from Task 2.
- Produces: `composeSite({ siteMap, collections, imported, importBatchId, existingPages }) -> { pages }` — an array of full page entities ready to append to `siteConfig.pages`. Task 9 calls this from the import completion handlers. Each page carries `source: { importBatchId, sourceUrl }`.

Composition rules (deterministic, fixture-testable):
- Gallery pages: assets resolved from `imported` in the collection's `assetRefs` order (match `asset.source.sourceUrl === ref.remoteUrl`).
  - Fewer than 8 assets → a single masonry `photos` block.
  - 8 or more → opener `photo` block: the landscape asset with the largest `width*height` (fallback: first asset); then over the remaining assets, repeat runs of [masonry×10, solo photo (prefer next landscape), stacked×6] until exhausted; a final run shorter than 4 merges into the previous `photos` block.
- About pages: heading text block (variant 1, content = page title) + markdown body text block (variant 3, `format:'markdown'`, content = textContent) + a portrait-orientation photo block after the heading when the page's collection has a portrait asset.
- Contact pages: `defaultBlock('contact')`.
- Pages with kind `other` are skipped. Nav order: siteMap pages sorted by `navOrder` (nulls last, stable); `sortOrder` continues from `existingPages.length`. Slug collisions with `existingPages` (or within the batch) get `-2`, `-3` suffixes; page id = `pg-${stableHash(importBatchId + ':' + slug)}`.
- `siteMap` null/empty → `{ pages: [] }`.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/import/composer.test.js
import { composeSite } from '@/common/import/composer'

const asset = (url, { w = 2000, h = 1333, cid = 'c1' } = {}) => ({
  assetId: `a_${url}`, publicUrl: `https://gcs/${url}`, width: w, height: h,
  orientation: w === h ? 'square' : w > h ? 'landscape' : 'portrait',
  source: { sourceUrl: `https://x.com/${url}`, externalCollectionId: cid },
})
const refs = (n, cid) => Array.from({ length: n }, (_, i) => ({ remoteUrl: `https://x.com/p${cid}${i}.jpg` }))

function fixture(n) {
  const collections = [{ id: 'c1', name: 'Portraits', assetRefs: refs(n, 'c1') }]
  const imported = refs(n, 'c1').map((r, i) =>
    asset(`p c1${i}.jpg`.replace(' ', ''), { w: i === 3 ? 4000 : 1200, h: i % 2 ? 1600 : 800, cid: 'c1' }))
  // align sourceUrls
  imported.forEach((a, i) => { a.source.sourceUrl = `https://x.com/pc1${i}.jpg` })
  const siteMap = { pages: [{ kind: 'gallery', title: 'Portraits', slug: 'portraits', navOrder: 0, sourceUrl: 'https://x.com/portraits', textContent: '', collectionId: 'c1' }] }
  return { siteMap, collections, imported }
}

it('small collection becomes a single masonry block', () => {
  const { pages } = composeSite({ ...fixture(5), importBatchId: 'imp_1', existingPages: [] })
  expect(pages).toHaveLength(1)
  expect(pages[0].blocks).toEqual([
    expect.objectContaining({ type: 'photos', layout: 'masonry' }),
  ])
  expect(pages[0].blocks[0].imageUrls).toHaveLength(5)
  expect(pages[0].source).toEqual({ importBatchId: 'imp_1', sourceUrl: 'https://x.com/portraits' })
  expect(pages[0].showInNav).toBe(true)
})

it('large collection opens with the biggest landscape as a solo photo', () => {
  const { pages } = composeSite({ ...fixture(20), importBatchId: 'imp_1', existingPages: [] })
  const blocks = pages[0].blocks
  expect(blocks[0].type).toBe('photo')
  expect(blocks[0].imageUrl).toBe('https://gcs/pc13.jpg') // 4000px landscape
  const total = blocks.reduce((n, b) => n + (b.type === 'photo' ? 1 : b.imageUrls.length), 0)
  expect(total).toBe(20) // every asset placed exactly once
})

it('composes about and contact pages and skips other', () => {
  const siteMap = { pages: [
    { kind: 'about', title: 'About', slug: 'about', navOrder: 0, sourceUrl: 'https://x.com/about', textContent: 'Hi.\n\nI shoot.', collectionId: 'about' },
    { kind: 'contact', title: 'Contact', slug: 'contact', navOrder: 1, sourceUrl: 'https://x.com/contact', textContent: '', collectionId: 'contact' },
    { kind: 'other', title: 'Misc', slug: 'misc', navOrder: null, sourceUrl: 'https://x.com/misc', textContent: '', collectionId: 'misc' },
  ] }
  const { pages } = composeSite({ siteMap, collections: [], imported: [], importBatchId: 'imp_1', existingPages: [] })
  expect(pages.map((p) => p.kind)).toEqual(['about', 'contact'])
  const about = pages[0]
  expect(about.blocks[0]).toMatchObject({ type: 'text', variant: 1, content: 'About' })
  expect(about.blocks[1]).toMatchObject({ type: 'text', variant: 3, format: 'markdown', content: 'Hi.\n\nI shoot.' })
  expect(pages[1].blocks[0].type).toBe('contact')
})

it('suffixes colliding slugs and continues sortOrder after existing pages', () => {
  const { siteMap, collections, imported } = fixture(5)
  const existingPages = [{ slug: 'portraits', sortOrder: 0 }, { slug: 'x', sortOrder: 1 }]
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages })
  expect(pages[0].slug).toBe('portraits-2')
  expect(pages[0].sortOrder).toBe(2)
})

it('returns no pages without a site map', () => {
  expect(composeSite({ siteMap: null, collections: [], imported: [], importBatchId: 'i', existingPages: [] }).pages).toEqual([])
})
```

- [ ] **Step 2: Run to verify failure** — `npx jest __tests__/import/composer.test.js`.

- [ ] **Step 3: Implement `common/import/composer.js`**

```js
import { defaultPage } from '@/common/siteConfig'
import { defaultBlock } from '@/common/blocks'
import { stableHash } from './importCore'

const MASONRY_RUN = 10
const STACKED_RUN = 6
const MIN_TAIL = 4

function photosBlock(assets, layout) {
  return {
    ...defaultBlock(layout === 'masonry' ? 'masonry' : 'stacked'),
    images: assets.map((a) => ({ url: a.publicUrl, assetId: a.assetId })),
    imageUrls: assets.map((a) => a.publicUrl),
    layout,
  }
}

function takeSolo(assets) {
  const i = assets.findIndex((a) => a.orientation === 'landscape')
  return assets.splice(i === -1 ? 0 : i, 1)[0]
}

// Opener + alternating masonry / solo / stacked runs. Deterministic: same
// assets in, same blocks out.
export function composeGalleryBlocks(assets) {
  if (!assets.length) return []
  if (assets.length < 8) return [photosBlock(assets, 'masonry')]

  const rest = [...assets]
  let openerIdx = -1
  let best = -1
  rest.forEach((a, i) => {
    const px = (a.width || 0) * (a.height || 0)
    if (a.orientation === 'landscape' && px > best) { best = px; openerIdx = i }
  })
  const opener = rest.splice(openerIdx === -1 ? 0 : openerIdx, 1)[0]
  const blocks = [{ ...defaultBlock('photo'), imageUrl: opener.publicUrl }]

  const runs = [
    () => rest.length && blocks.push(photosBlock(rest.splice(0, MASONRY_RUN), 'masonry')),
    () => rest.length && blocks.push({ ...defaultBlock('photo'), imageUrl: takeSolo(rest).publicUrl }),
    () => rest.length && blocks.push(photosBlock(rest.splice(0, STACKED_RUN), 'stacked')),
  ]
  let i = 0
  while (rest.length) {
    if (rest.length < MIN_TAIL) {
      // Tail too small for its own block — fold into the last photos block,
      // or emit as one small masonry if none exists yet.
      const lastPhotos = [...blocks].reverse().find((b) => b.type === 'photos')
      if (lastPhotos) {
        lastPhotos.images.push(...rest.map((a) => ({ url: a.publicUrl, assetId: a.assetId })))
        lastPhotos.imageUrls.push(...rest.map((a) => a.publicUrl))
        rest.length = 0
      } else {
        blocks.push(photosBlock(rest.splice(0), 'masonry'))
      }
      break
    }
    runs[i % runs.length]()
    i += 1
  }
  return blocks
}

function assetsForCollection(collection, assetBySourceUrl) {
  if (!collection) return []
  return (collection.assetRefs || [])
    .map((r) => assetBySourceUrl.get(r.remoteUrl))
    .filter(Boolean)
}

function uniqueSlug(base, taken) {
  let slug = base || 'page'
  let n = 2
  while (taken.has(slug)) { slug = `${base}-${n}`; n += 1 }
  taken.add(slug)
  return slug
}

export function composeSite({ siteMap, collections, imported, importBatchId, existingPages }) {
  const mapPages = siteMap?.pages?.filter((p) => p.kind !== 'other') || []
  if (!mapPages.length) return { pages: [] }

  const assetBySourceUrl = new Map((imported || []).map((a) => [a.source?.sourceUrl, a]))
  const collectionById = new Map((collections || []).map((c) => [c.id, c]))
  const taken = new Set((existingPages || []).map((p) => p.slug).filter(Boolean))

  const ordered = [...mapPages].sort((a, b) => {
    const an = a.navOrder ?? Infinity
    const bn = b.navOrder ?? Infinity
    return an - bn
  })

  const pages = []
  ordered.forEach((page, i) => {
    const assets = assetsForCollection(collectionById.get(page.collectionId), assetBySourceUrl)
    let blocks
    if (page.kind === 'gallery') {
      if (!assets.length) return // an empty gallery page helps no one
      blocks = composeGalleryBlocks(assets)
    } else if (page.kind === 'about') {
      blocks = [{ ...defaultBlock('text'), variant: 1, content: page.title }]
      const portrait = assets.find((a) => a.orientation === 'portrait')
      if (portrait) blocks.push({ ...defaultBlock('photo'), imageUrl: portrait.publicUrl })
      blocks.push({ ...defaultBlock('text'), variant: 3, format: 'markdown', content: page.textContent || '' })
    } else {
      blocks = [defaultBlock('contact')]
    }
    const slug = uniqueSlug(page.slug, taken)
    pages.push(
      defaultPage({
        id: `pg-${stableHash(`${importBatchId}:${slug}`)}`,
        title: page.title,
        template: page.kind === 'gallery' ? 'gallery' : page.kind,
        slug,
        showInNav: true,
        sortOrder: (existingPages?.length || 0) + pages.length,
        blocks,
        source: { importBatchId: importBatchId || null, sourceUrl: page.sourceUrl || null },
      })
    )
  })
  return { pages }
}
```

Note: `defaultPage` spreads `...rest`, so `slug`, `blocks`, and `source` land on the page entity.

- [ ] **Step 4: Run tests** — `npx jest __tests__/import/composer.test.js` → PASS (fix implementation, not intent, if counts drift).

- [ ] **Step 5: Commit** — `git commit -m "feat(import): layout composer builds pages and blocks from a site map"`

---

### Task 7: Imported collections become library Sets

**Files:**
- Modify: `common/import/importClient.js:77-99` (`applyImportToConfig`)
- Test: `__tests__/import/importClient.test.js` (extend)

**Interfaces:**
- Consumes: `stableHash` from importCore; existing set shape `{ setId, name, kind:'manual', assetIds, rule, createdAt, updatedAt }` (see `normalizeSets`, `common/adminConfig.js:34-49`).
- Produces: `applyImportToConfig(config, { imported, collections, importBatchId, now })` returns `{ ...config, assets, sets }` — writes Sets (and `asset.setIds`), no longer writes `galleries`, and preserves every other config field instead of dropping them.

- [ ] **Step 1: Read the existing tests** in `__tests__/import/importClient.test.js` covering `applyImportToConfig` so assertions about `galleries` get updated, not deleted blindly.

- [ ] **Step 2: Write/adjust failing tests**

```js
it('groups imported assets into library sets, not galleries', () => {
  const config = { assets: {}, sets: {}, savedViews: [{ id: 'v1' }], galleries: { keep: ['x'] } }
  const imported = [
    { assetId: 'a1', publicUrl: 'https://gcs/1.jpg', source: { externalCollectionId: 'c1' } },
    { assetId: 'a2', publicUrl: 'https://gcs/2.jpg', source: { externalCollectionId: 'c1' } },
  ]
  const collections = [{ id: 'c1', name: 'Portraits' }]
  const next = applyImportToConfig(config, { imported, collections, importBatchId: 'imp_1', now: '2026-08-16T00:00:00.000Z' })
  const sets = Object.values(next.sets)
  expect(sets).toHaveLength(1)
  expect(sets[0]).toMatchObject({ name: 'Portraits', kind: 'manual', assetIds: ['a1', 'a2'] })
  expect(next.assets.a1.setIds).toEqual([sets[0].setId])
  expect(next.galleries).toEqual({ keep: ['x'] })      // untouched
  expect(next.savedViews).toEqual([{ id: 'v1' }])      // preserved, not dropped
})

it('merges into an existing set with the same name', () => {
  const config = { assets: {}, sets: { s1: { setId: 's1', name: 'Portraits', kind: 'manual', assetIds: ['a0'] } } }
  const imported = [{ assetId: 'a1', publicUrl: 'u', source: { externalCollectionId: 'c1' } }]
  const next = applyImportToConfig(config, { imported, collections: [{ id: 'c1', name: 'Portraits' }], importBatchId: 'imp_1', now: 'T' })
  expect(next.sets.s1.assetIds).toEqual(['a0', 'a1'])
  expect(next.assets.a1.setIds).toEqual(['s1'])
})
```

- [ ] **Step 3: Run to verify failure** — `npx jest __tests__/import/importClient.test.js`.

- [ ] **Step 4: Reimplement `applyImportToConfig`**

```js
import { newImportBatchId, stableHash, slugify } from '@/common/import/importCore'
```

```js
export function applyImportToConfig(config, { imported, collections, importBatchId, now }) {
  const nameById = {}
  for (const c of collections || []) nameById[c.id] = c.name

  const assets = { ...(config.assets || {}) }
  const sets = { ...(config.sets || {}) }
  const ts = now || new Date().toISOString()

  const setForCollection = (cid) => {
    const name = nameById[cid] || cid
    const existing = Object.values(sets).find((s) => s?.name === name)
    if (existing) return existing.setId
    const setId = `set-${stableHash(`${importBatchId || ''}:${cid}`)}`
    sets[setId] = { setId, name, kind: 'manual', assetIds: [], rule: null, createdAt: ts, updatedAt: ts }
    return setId
  }

  for (const asset of imported || []) {
    const prev = config.assets?.[asset.assetId] || {}
    const merged = { ...prev, ...asset }
    const cid = asset.source?.externalCollectionId
    if (cid != null) {
      const setId = setForCollection(cid)
      const set = sets[setId]
      if (!set.assetIds.includes(asset.assetId)) set.assetIds = [...set.assetIds, asset.assetId]
      set.updatedAt = ts
      merged.setIds = [...new Set([...(prev.setIds || []), setId])]
    }
    assets[asset.assetId] = merged
  }

  return { ...config, assets, sets }
}
```

Update both call sites to pass `importBatchId`: `pages/onboarding.js:155-171` and `components/admin/AdminLibrary.js` call `applyImportToConfig(currentConfig, summary)` — `summary` will carry `importBatchId` after Task 9; passing the whole summary object stays correct since the function destructures. Verify the existing `summary` object in `ImportFlow.js:82-93` — if `importBatchId` isn't in it yet, that lands in Task 9; the function must tolerate `importBatchId` undefined (it does — falls back to collection-id hash).

- [ ] **Step 5: Run tests** — `npx jest __tests__/import/importClient.test.js` → all PASS (including pre-existing ones you adjusted).

- [ ] **Step 6: Commit** — `git commit -m "fix(import): imported collections become library sets and config fields are preserved"`

---

### Task 8: `page.source` survives normalization

**Files:**
- Modify (if needed): `common/assetRefs.js:220` (`normalizePageEntity`)
- Test: `__tests__/common/normalizePageEntity.test.js` (extend)

**Interfaces:**
- Consumes: `normalizePageEntity(page)` — runs on every site-config read (`common/siteConfig.js:240`).
- Produces: guarantee that `source: { importBatchId, sourceUrl }` and `format`-bearing blocks pass through reads unchanged. Tasks 6/9/10 rely on it.

- [ ] **Step 1: Write the test**

```js
it('preserves import provenance and block format fields', () => {
  const page = normalizePageEntity({
    id: 'pg-x', title: 'T', slug: 't',
    source: { importBatchId: 'imp_1', sourceUrl: 'https://x.com/t' },
    blocks: [{ type: 'text', content: '# hi', format: 'markdown' }],
  })
  expect(page.source).toEqual({ importBatchId: 'imp_1', sourceUrl: 'https://x.com/t' })
  expect(page.blocks[0].format).toBe('markdown')
})
```

- [ ] **Step 2: Run it** — `npx jest __tests__/common/normalizePageEntity.test.js`. If it passes already (normalizer spreads the input), keep the test as a regression guard and skip Step 3.

- [ ] **Step 3 (only if failing): Fix `normalizePageEntity`** to carry the fields through — start its returned object from a spread of the input page (`{ ...page, thumbnail: ..., cover: ..., slug: ... }`) rather than an allowlist, or explicitly add `source: page.source ?? null` and ensure blocks pass through untouched. Match the file's existing style.

- [ ] **Step 4: Run the full common test dir** — `npx jest __tests__/common` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "test: page source provenance and block format survive normalization"`

---

### Task 9: Wire replication into import completion

**Files:**
- Modify: `components/admin/import/ImportFlow.js` (~lines 82-93, summary build; and wherever the discover result is stored)
- Modify: `pages/onboarding.js:155-171` (onComplete)
- Modify: `components/admin/AdminLibrary.js` (its equivalent onComplete)
- Test: `__tests__/import/applyComposedPages.test.js` (create) for the merge helper; flow wiring is verified by QA at the end.

**Interfaces:**
- Consumes: `composeSite` (Task 6). Discover API already returns `siteMap` (Task 3/4).
- Produces: `applyComposedPages(siteConfig, composedPages) -> nextSiteConfig` exported from `common/import/composer.js`; `summary` gains `siteMap` and `importBatchId`.

- [ ] **Step 1: Write the failing test for the merge helper**

```js
// __tests__/import/applyComposedPages.test.js
import { applyComposedPages } from '@/common/import/composer'

it('appends composed pages to the site config pages array', () => {
  const config = { pages: [{ id: 'p1' }], theme: 'kyoto' }
  const next = applyComposedPages(config, [{ id: 'pg-a' }, { id: 'pg-b' }])
  expect(next.pages.map((p) => p.id)).toEqual(['p1', 'pg-a', 'pg-b'])
  expect(next.theme).toBe('kyoto')
  expect(applyComposedPages(config, []).pages).toHaveLength(1)
})

it('never adds a page whose id already exists (re-run safety)', () => {
  const config = { pages: [{ id: 'pg-a' }] }
  expect(applyComposedPages(config, [{ id: 'pg-a' }]).pages).toHaveLength(1)
})
```

- [ ] **Step 2: Run to verify failure**, then add to `common/import/composer.js`:

```js
export function applyComposedPages(siteConfig, composedPages) {
  const existing = new Set((siteConfig.pages || []).map((p) => p.id))
  const fresh = (composedPages || []).filter((p) => !existing.has(p.id))
  return { ...siteConfig, pages: [...(siteConfig.pages || []), ...fresh] }
}
```

Run: `npx jest __tests__/import/applyComposedPages.test.js` → PASS.

- [ ] **Step 3: Thread `siteMap` + `importBatchId` through ImportFlow**

In `components/admin/import/ImportFlow.js`: the discover step stores the discover response (find the state that holds `collections`/`site`). Keep `siteMap` from the response in state alongside them, and when the summary is built (`ImportFlow.js:82-93`), extend it:

```js
const summary = { importedCount, failedCount, setsCount, site, imported, collections, siteMap, importBatchId }
```

(`importBatchId` is already computed in the flow via `makeImportBatchId` — locate it in the same file and include it; if it lives in a ref/variable with a different name, use that.)

- [ ] **Step 4: Create pages in both onComplete handlers**

In `pages/onboarding.js` (and the equivalent handler in `components/admin/AdminLibrary.js`), after the existing library PUT, add:

```js
import { composeSite, applyComposedPages } from '@/common/import/composer'
```

```js
  if (summary.siteMap?.pages?.length) {
    const scRes = await fetch('/api/admin/site-config')
    const siteConfig = scRes.ok ? await scRes.json() : { pages: [] }
    const { pages } = composeSite({
      siteMap: summary.siteMap,
      collections: summary.collections,
      imported: summary.imported,
      importBatchId: summary.importBatchId,
      existingPages: siteConfig.pages || [],
    })
    if (pages.length) {
      await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applyComposedPages(siteConfig, pages)),
      })
    }
  }
```

Check what shape GET `/api/admin/site-config` returns on the client (it may wrap the config, e.g. `{ config }` — read the existing usage at `pages/admin/index.js:157` and match it).

- [ ] **Step 5: Run the full import suite** — `npx jest __tests__/import` → PASS. Then `npx jest` (whole suite) → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(import): auto-create site pages from the imported site map"`

---

### Task 10: Conditional onboarding tour step

**Files:**
- Modify: `components/admin/onboarding/tourSteps.js:7-55`
- Test: `__tests__/components/tourSteps.test.js` (create)

**Interfaces:**
- Consumes: `buildTourSteps({ imported })` — already called with `imported` from `pages/admin/index.js:610-617`.
- Produces: an extra step after the "Your pages" step when `imported` is true.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/tourSteps.test.js
import { buildTourSteps } from '@/components/admin/onboarding/tourSteps'

it('includes the imported-pages step only after an import', () => {
  const plain = buildTourSteps({ imported: false })
  const imported = buildTourSteps({ imported: true })
  expect(plain.some((s) => /imported/i.test(s.title || ''))).toBe(false)
  const step = imported.find((s) => /pages we imported/i.test(s.title || ''))
  expect(step).toBeTruthy()
  const pagesIdx = imported.findIndex((s) => s.selector === '[data-tour="pages-section"]')
  expect(imported.indexOf(step)).toBe(pagesIdx + 1)
})
```

- [ ] **Step 2: Run to verify failure**, then implement: in `buildTourSteps`, insert after the `pages-section` step:

```js
    ...(imported
      ? [{
          selector: '[data-tour="pages-section"]',
          title: 'Pages we imported for you',
          body: 'We rebuilt these pages from your old site, photos and all. Open any of them to fine-tune the layout, and if you would rather begin from a clean slate, you can delete them anytime from your profile menu.',
          placement: 'right',
        }]
      : []),
```

- [ ] **Step 3: Run tests** — `npx jest __tests__/components/tourSteps.test.js` → PASS.

- [ ] **Step 4: Commit** — `git commit -m "feat(onboarding): tour explains imported pages after a site import"`

---

### Task 11: Markdown parser

**Files:**
- Create: `common/markdown.js`
- Test: `__tests__/common/markdown.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `parseMarkdown(text) -> Block[]` where Block is one of
  `{ type:'heading', level: 1|2|3, children: Inline[] }`, `{ type:'paragraph', children: Inline[] }`, `{ type:'quote', children: Inline[] }`, `{ type:'list', items: Inline[][] }`, `{ type:'image', url, caption }`;
  Inline is `{ type:'text', value }`, `{ type:'bold', children: Inline[] }`, `{ type:'italic', children: Inline[] }`, `{ type:'link', url, children: Inline[] }`.
  Tasks 12–14 consume this AST. No HTML parsing: raw HTML in input stays literal text.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/common/markdown.test.js
import { parseMarkdown } from '@/common/markdown'

it('parses headings, paragraphs, quotes, lists, images', () => {
  const ast = parseMarkdown('# Title\n\nHello **bold** and *ital*.\n\n> a quote\n\n- one\n- two\n\n![Me at work](https://gcs/me.jpg)')
  expect(ast.map((b) => b.type)).toEqual(['heading', 'paragraph', 'quote', 'list', 'image'])
  expect(ast[0]).toMatchObject({ level: 1, children: [{ type: 'text', value: 'Title' }] })
  expect(ast[1].children).toEqual([
    { type: 'text', value: 'Hello ' },
    { type: 'bold', children: [{ type: 'text', value: 'bold' }] },
    { type: 'text', value: ' and ' },
    { type: 'italic', children: [{ type: 'text', value: 'ital' }] },
    { type: 'text', value: '.' },
  ])
  expect(ast[4]).toEqual({ type: 'image', url: 'https://gcs/me.jpg', caption: 'Me at work' })
})

it('parses links and nested emphasis', () => {
  const ast = parseMarkdown('See [my **work**](https://x.com/work) now')
  expect(ast[0].children[1]).toMatchObject({ type: 'link', url: 'https://x.com/work' })
  expect(ast[0].children[1].children[1]).toMatchObject({ type: 'bold' })
})

it('treats raw HTML as literal text (no passthrough)', () => {
  const ast = parseMarkdown('<script>alert(1)</script> hi')
  expect(ast[0].children[0].value).toContain('<script>')
})

it('plain text round-trips as a single paragraph per blank-line group', () => {
  const ast = parseMarkdown('First para line one.\nStill first para.\n\nSecond para.')
  expect(ast).toHaveLength(2)
  expect(ast[0].children[0].value).toBe('First para line one.\nStill first para.')
})

it('handles empty input', () => {
  expect(parseMarkdown('')).toEqual([])
  expect(parseMarkdown(null)).toEqual([])
})
```

- [ ] **Step 2: Run to verify failure**, then implement `common/markdown.js`:

```js
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
```

- [ ] **Step 3: Run tests** — `npx jest __tests__/common/markdown.test.js` → PASS.

- [ ] **Step 4: Commit** — `git commit -m "feat(text): minimal safe markdown parser"`

---

### Task 12: MarkdownText renderer + Gallery integration

**Files:**
- Create: `components/image-displays/MarkdownText.js`
- Modify: `components/image-displays/gallery/Gallery.js:489-524` (the `case "text"` branch)
- Test: `__tests__/components/MarkdownText.test.js` (create)

**Interfaces:**
- Consumes: `parseMarkdown`/`parseInline` (Task 11); Gallery's existing resolved values (`alignClass`, `fontFamily`, and the theme size classes it computes for variants).
- Produces: `<MarkdownText content variantClasses />` where `variantClasses = { heading, body, quote }` (className strings). Task 13 reuses `renderInline` for the sidebar snippet: export it.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/MarkdownText.test.js
import { render, screen } from '@testing-library/react'
import MarkdownText from '@/components/image-displays/MarkdownText'

const classes = { heading: 'h-cls', body: 'b-cls', quote: 'q-cls' }

it('renders headings, emphasis, images and quotes with the given classes', () => {
  const { container } = render(
    <MarkdownText content={'# About Me\n\nI shoot **film** mostly.\n\n> light is everything\n\n![On location](https://gcs/x.jpg)'} variantClasses={classes} />
  )
  expect(screen.getByText('About Me').className).toContain('h-cls')
  expect(screen.getByText('film').tagName).toBe('STRONG')
  expect(screen.getByText('light is everything').className).toContain('q-cls')
  const img = container.querySelector('img')
  expect(img.getAttribute('src')).toBe('https://gcs/x.jpg')
  expect(screen.getByText('On location')).toBeTruthy() // caption
})

it('never renders raw HTML from content', () => {
  const { container } = render(<MarkdownText content={'<img src=x onerror=alert(1)> hi'} variantClasses={classes} />)
  expect(container.querySelector('img')).toBeNull()
})
```

- [ ] **Step 2: Run to verify failure**, then implement `components/image-displays/MarkdownText.js`:

```jsx
import React from 'react'
import { parseMarkdown } from '@/common/markdown'

export function renderInline(nodes, keyPrefix = 'i') {
  return (nodes || []).map((n, i) => {
    const key = `${keyPrefix}-${i}`
    if (n.type === 'bold') return <strong key={key}>{renderInline(n.children, key)}</strong>
    if (n.type === 'italic') return <em key={key}>{renderInline(n.children, key)}</em>
    if (n.type === 'link')
      return (
        <a key={key} href={n.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {renderInline(n.children, key)}
        </a>
      )
    return <React.Fragment key={key}>{n.value}</React.Fragment>
  })
}

// Layout-agnostic markdown body. The theme decides what heading/body/quote
// look like via variantClasses; this component only supplies structure.
export default function MarkdownText({ content, variantClasses }) {
  const ast = parseMarkdown(content)
  const vc = variantClasses || {}
  return (
    <div className="markdown-text space-y-5">
      {ast.map((b, i) => {
        if (b.type === 'heading') return <div key={i} className={vc.heading}>{renderInline(b.children)}</div>
        if (b.type === 'quote') return <div key={i} className={`${vc.quote || vc.body || ''} border-l-2 pl-4 opacity-90`}>{renderInline(b.children)}</div>
        if (b.type === 'list')
          return (
            <ul key={i} className={`${vc.body || ''} list-disc pl-5 space-y-1`}>
              {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          )
        if (b.type === 'image')
          return (
            <figure key={i} className="my-6">
              <img src={b.url} alt={b.caption || ''} className="w-full h-auto" loading="lazy" />
              {b.caption ? <figcaption className="mt-2 text-sm opacity-60">{b.caption}</figcaption> : null}
            </figure>
          )
        return <div key={i} className={`${vc.body || ''} whitespace-pre-line`}>{renderInline(b.children)}</div>
      })}
    </div>
  )
}
```

- [ ] **Step 3: Integrate into Gallery.js**

In the `case "text"` branch (`Gallery.js:489`), the code already computes `variantClass` from a `v` number. Refactor minimally: compute the class string for a given `v` via a small local helper (extract the existing ternary into `classForV(v)` so it can be called for v=1 heading, v=3 body, v=4 quote), keeping the Manhattan branch behavior identical. Then before the existing return:

```jsx
if (block.format === 'markdown') {
  return (
    <div className={`text-block ${alignClass}`} data-block-index={index} {...hoverProps} style={{ ...hoverProps.style, fontFamily }}>
      <MarkdownText
        content={block.content}
        variantClasses={{ heading: classForV(1), body: classForV(3), quote: classForV(4) }}
      />
    </div>
  )
}
```

with `import MarkdownText from '@/components/image-displays/MarkdownText'` at the top. The plain-text path stays byte-for-byte identical for blocks without `format`.

- [ ] **Step 4: Run tests** — `npx jest __tests__/components/MarkdownText.test.js` and the full suite `npx jest` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(text): markdown text blocks render through theme typography"`

---

### Task 13: BlockCard — markdown entry point and snippet preview

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js:981-989` (text-block area) and its props (`BlockCard.js:223`)
- Modify: `components/admin/gallery-builder/BlockBuilder.js:534-537` (pass the new prop)
- Test: `__tests__/components/BlockCardMarkdown.test.js` (create)

**Interfaces:**
- Consumes: `parseMarkdown` + `renderInline` (Tasks 11/12); `onUpdate` whole-block replacement pattern; new prop `onOpenMarkdownEditor()` supplied by BlockBuilder (Task 14 hosts the panel).
- Produces: plain text blocks show an "Open markdown editor" link; markdown blocks show a read-only formatted snippet + badge that opens the editor on click.

- [ ] **Step 1: Write the failing test.** BlockCard is large; test it through a focused render. If BlockCard has heavy context requirements, extract the new UI into a small component `components/admin/gallery-builder/TextBlockField.js` and test that directly:

```jsx
// components/admin/gallery-builder/TextBlockField.js
import { parseMarkdown } from '@/common/markdown'
import { renderInline } from '@/components/image-displays/MarkdownText'

// Sidebar face of a text block. Plain text edits inline; markdown blocks
// render a read-only snippet that hands editing to the slide-out panel.
export default function TextBlockField({ block, onUpdate, onOpenMarkdownEditor, AutoGrowTextarea, inputClass }) {
  if (block.format === 'markdown') {
    const ast = parseMarkdown(block.content).filter((b) => b.type !== 'image').slice(0, 3)
    return (
      <button
        type="button"
        onClick={onOpenMarkdownEditor}
        className="w-full text-left text-sm leading-snug text-neutral-600 hover:text-neutral-900"
        title="Edit in markdown editor"
      >
        <span className="mb-1 inline-block rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
          Markdown
        </span>
        <span className="block max-h-24 overflow-hidden">
          {ast.length
            ? ast.map((b, i) => <span key={i} className="block truncate">{renderInline(b.children || [])}</span>)
            : <span className="italic opacity-60">Empty — click to write</span>}
        </span>
      </button>
    )
  }
  return (
    <div>
      <AutoGrowTextarea
        className={inputClass}
        placeholder="Write something…"
        maxHeight={160}
        value={block.content || ''}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
      />
      <button type="button" onClick={onOpenMarkdownEditor} className="mt-1 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800">
        Open markdown editor
      </button>
    </div>
  )
}
```

Test:

```jsx
// __tests__/components/BlockCardMarkdown.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import TextBlockField from '@/components/admin/gallery-builder/TextBlockField'

const Textarea = (props) => <textarea {...props} />

it('plain block shows textarea plus an open-editor link', () => {
  const open = jest.fn()
  render(<TextBlockField block={{ type: 'text', content: 'hi' }} onUpdate={jest.fn()} onOpenMarkdownEditor={open} AutoGrowTextarea={Textarea} inputClass="" />)
  expect(screen.getByPlaceholderText(/write something/i).value).toBe('hi')
  fireEvent.click(screen.getByRole('button', { name: /open markdown editor/i }))
  expect(open).toHaveBeenCalled()
})

it('markdown block shows a formatted read-only snippet that opens the editor', () => {
  const open = jest.fn()
  render(<TextBlockField block={{ type: 'text', format: 'markdown', content: 'I shoot **film**' }} onUpdate={jest.fn()} onOpenMarkdownEditor={open} AutoGrowTextarea={Textarea} inputClass="" />)
  expect(screen.queryByPlaceholderText(/write something/i)).toBeNull()
  expect(screen.getByText('film').tagName).toBe('STRONG')
  fireEvent.click(screen.getByText(/markdown/i).closest('button'))
  expect(open).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify failure, implement, run to green** — `npx jest __tests__/components/BlockCardMarkdown.test.js`.

- [ ] **Step 3: Swap into BlockCard.** Replace the `block.type === "text"` textarea at `BlockCard.js:981-989` with:

```jsx
{block.type === "text" && (
  <TextBlockField
    block={block}
    onUpdate={onUpdate}
    onOpenMarkdownEditor={() => onOpenMarkdownEditor?.()}
    AutoGrowTextarea={AutoGrowTextarea}
    inputClass={`${INPUT} resize-none scroll-thin !pt-0`}
  />
)}
```

Add `onOpenMarkdownEditor` to BlockCard's props and pass it from BlockBuilder (`BlockBuilder.js:534`): `onOpenMarkdownEditor={() => setMarkdownEditorIndex(index)}` — the state lands in Task 14; for this commit define the state in BlockBuilder (`const [markdownEditorIndex, setMarkdownEditorIndex] = useState(null)`) even though the panel arrives next task.

- [ ] **Step 4: Full suite** — `npx jest` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(text): sidebar text block gains markdown snippet and editor entry point"`

---

### Task 14: Markdown editor slide-out panel

**Files:**
- Create: `components/admin/gallery-builder/MarkdownEditorPanel.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js` (host the panel; thread library props if not already present)
- Test: `__tests__/components/MarkdownEditorPanel.test.js` (create)

**Interfaces:**
- Consumes: `PhotoPickerModal` (`components/admin/gallery-builder/PhotoPickerModal.js:789` — props `{ images, loading, blockType, onConfirm, onClose, libraryConfig }`, `onConfirm(refs)` with refs `[{ url, assetId }]`, parent conditionally mounts it); drawer pattern from `components/image-displays/engagement/PackagesDrawer.js:92-98`; `updateBlock(index, updated)` in BlockBuilder.
- Produces: `<MarkdownEditorPanel open block onChange onClose libraryImages libraryConfig libraryLoading />`. Every edit calls `onChange({ ...block, content, format: 'markdown', images })` where `images` tracks inserted assets `[{ assetId, url }]`.

- [ ] **Step 1: Write the failing tests**

```jsx
// __tests__/components/MarkdownEditorPanel.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownEditorPanel from '@/components/admin/gallery-builder/MarkdownEditorPanel'

jest.mock('@/components/admin/gallery-builder/PhotoPickerModal', () => (props) => (
  <button data-testid="picker" onClick={() => props.onConfirm([{ url: 'https://gcs/pic.jpg', assetId: 'a9' }])}>pick</button>
))

const block = { type: 'text', content: 'Hello world' }

it('edits content and stamps format markdown', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello **world**' } })
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello **world**', format: 'markdown' }))
})

it('toolbar bold wraps the selection', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const ta = screen.getByRole('textbox')
  ta.setSelectionRange(0, 5)
  fireEvent.click(screen.getByRole('button', { name: /bold/i }))
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: '**Hello** world' }))
})

it('inserts a picked image as markdown and tracks it on block.images', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.click(screen.getByRole('button', { name: /image/i }))
  fireEvent.click(screen.getByTestId('picker'))
  const call = onChange.mock.calls.at(-1)[0]
  expect(call.content).toContain('![](https://gcs/pic.jpg)')
  expect(call.images).toEqual([{ assetId: 'a9', url: 'https://gcs/pic.jpg' }])
})

it('escape closes', () => {
  const onClose = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={onClose} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify failure, then implement the panel**

```jsx
// components/admin/gallery-builder/MarkdownEditorPanel.js
import { useEffect, useRef, useState } from 'react'
import PhotoPickerModal from '@/components/admin/gallery-builder/PhotoPickerModal'

const PANEL_WIDTH = 440

// Essay-style markdown editor for a text block. Layout-agnostic on purpose:
// the themed preview in the center is the live rendering; this panel only
// handles structure and emphasis. Any edit stamps format:'markdown'.
export default function MarkdownEditorPanel({ open, block, onChange, onClose, libraryImages, libraryConfig, libraryLoading }) {
  const taRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape' && !pickerOpen) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pickerOpen, onClose])

  if (!block) return null
  const content = block.content || ''
  const emit = (nextContent, extraPatch = {}) =>
    onChange({ ...block, content: nextContent, format: 'markdown', ...extraPatch })

  const wrapSelection = (marker) => {
    const ta = taRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const sel = content.slice(s, e) || 'text'
    emit(`${content.slice(0, s)}${marker}${sel}${marker}${content.slice(e)}`)
  }
  const prefixLine = (prefix) => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const lineStart = content.lastIndexOf('\n', s - 1) + 1
    emit(`${content.slice(0, lineStart)}${prefix}${content.slice(lineStart)}`)
  }
  const insertImages = (refs) => {
    setPickerOpen(false)
    if (!refs?.length) return
    const ta = taRef.current
    const at = ta ? ta.selectionStart : content.length
    const md = refs.map((r) => `![](${r.url})`).join('\n\n')
    const before = content.slice(0, at)
    const after = content.slice(at)
    const next = `${before}${before && !before.endsWith('\n\n') ? '\n\n' : ''}${md}${after && !after.startsWith('\n') ? '\n\n' : ''}${after}`
    const seen = new Set((block.images || []).map((i) => i.assetId))
    const images = [...(block.images || []), ...refs.filter((r) => r.assetId && !seen.has(r.assetId)).map((r) => ({ assetId: r.assetId, url: r.url }))]
    emit(next, { images })
  }
  const onKeyDown = (e) => {
    // "/" on an empty line opens the photo picker
    if (e.key === '/') {
      const ta = taRef.current
      const s = ta.selectionStart
      const lineStart = content.lastIndexOf('\n', s - 1) + 1
      if (content.slice(lineStart, s).trim() === '') {
        e.preventDefault()
        setPickerOpen(true)
      }
    }
  }

  const TOOLBAR = [
    { name: 'Bold', act: () => wrapSelection('**'), label: 'B' },
    { name: 'Italic', act: () => wrapSelection('*'), label: 'I' },
    { name: 'Heading', act: () => prefixLine('# '), label: 'H' },
    { name: 'Quote', act: () => prefixLine('> '), label: '"' },
    { name: 'Image', act: () => setPickerOpen(true), label: 'Img' },
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,14,8,0.25)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s' }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81,
          width: PANEL_WIDTH, maxWidth: '92vw', background: '#fff',
          boxShadow: open ? '-24px 0 60px rgba(20,14,8,0.4)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="text-sm font-medium">Markdown editor</div>
          <div className="flex items-center gap-1">
            {TOOLBAR.map((t) => (
              <button key={t.name} type="button" aria-label={t.name} title={t.name} onClick={t.act}
                className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
                {t.label}
              </button>
            ))}
            <button type="button" onClick={onClose} className="ml-2 rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100">Done</button>
          </div>
        </div>
        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => emit(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={'Write your story…\n\nUse **bold**, *italics*, # headings — or type / on an empty line to add a photo.'}
          className="scroll-thin flex-1 resize-none p-4 text-sm leading-relaxed outline-none"
        />
        <div className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          Formatting appears live in the preview. The theme decides the final look.
        </div>
      </div>
      {pickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          libraryConfig={libraryConfig}
          loading={libraryLoading}
          blockType="photo"
          onConfirm={insertImages}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
```

Run: `npx jest __tests__/components/MarkdownEditorPanel.test.js` → PASS. (If the jsdom test can't reach `window` listeners, attach the Escape handler with `useEffect` as written — `fireEvent.keyDown(window, ...)` matches it.)

- [ ] **Step 3: Host in BlockBuilder.** Using the `markdownEditorIndex` state from Task 13, render at the end of BlockBuilder's JSX:

```jsx
<MarkdownEditorPanel
  open={markdownEditorIndex != null}
  block={markdownEditorIndex != null ? (galleryRef.current.blocks || [])[markdownEditorIndex] : null}
  onChange={(updated) => updateBlock(markdownEditorIndex, updated)}
  onClose={() => setMarkdownEditorIndex(null)}
  libraryImages={libraryImages}
  libraryConfig={libraryConfig}
  libraryLoading={libraryLoading}
/>
```

Check BlockBuilder's existing props for library data: GalleryBuilder already holds `libraryImages`/`libraryData`/`libraryLoading` (it passes them to its own PhotoPickerModal at `GalleryBuilder.js:254-263`). If BlockBuilder doesn't receive them, thread the three props from GalleryBuilder (and any other BlockBuilder call sites — search for `<BlockBuilder`) down to it, defaulting to `[]`/`{}`/`false` so call sites without a library still work.

- [ ] **Step 4: Full suite** — `npx jest` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(text): slide-out markdown editor with photo insertion"`

---

### Task 15: End-to-end verification (manual QA against the dev server)

**Files:** none (verification only)

- [ ] **Step 1:** Ensure `.env.local` is symlinked (`ln -sf ~/.secrets/<project>.env .env.local` if missing) and the dev server on port 3000 is running (do NOT run `next build`).
- [ ] **Step 2:** Run the full test suite once more: `npx jest` → all green.
- [ ] **Step 3:** In the app, exercise: (a) import a SmugMug or generic site URL through the library import flow and confirm pages appear in the sidebar with sensible blocks, sets appear in the library, and each imported page's gallery opens with a solo photo; (b) create a text block, open the markdown editor, add bold text, a heading, and a photo via `/`, and confirm the preview renders it themed and the sidebar card shows the snippet + badge; (c) confirm a plain text block behaves exactly as before.
- [ ] **Step 4:** Report results (screenshots or a short written pass/fail per flow) — fix anything broken before declaring done.

---

### Task 16: Replication becomes an opt-in choice on the import done screen

Added 2026-08-17 after user QA feedback: pages must not be created silently. When
site structure was detected, the done step asks the user; pages are composed only
on opt-in. Selection-scoping needs no composer change (galleries with no imported
assets are already skipped).

**Files:**
- Modify: `components/admin/import/ImportDoneStep.js`
- Modify: `components/admin/import/ImportFlow.js` (done-step wiring only)
- Modify: `pages/onboarding.js`, `components/admin/AdminLibrary.js` (gate composition on `summary.replicate`)
- Test: `__tests__/components/ImportDoneStep.test.js` (extend)

**Interfaces:**
- Consumes: `summary` already carries `siteMap` and `importBatchId` (Task 9); `ImportDoneStep({ summary, onEnter, onImportAnother })` with "Go to my studio" firing `onEnter`; ImportFlow renders it with `onEnter={() => onComplete(summary)}`.
- Produces: `onComplete` is always called with `summary.replicate` set (`true` only when the user chose to rebuild pages). Both completion handlers run page composition only `if (summary.replicate && summary.siteMap?.pages?.length)`.

Behavior:
- `canReplicate = (summary.siteMap?.pages?.length || 0) > 0`.
- When `canReplicate`: the done step describes what was found, derived from `summary.siteMap.pages` (e.g. "3 galleries, an about page, and a contact page" — counts by kind, omit kinds with zero, and only count gallery pages whose collection had at least one imported asset, matching what would actually be created). Two actions:
  - Primary: "Rebuild these pages for me" → `onComplete({ ...summary, replicate: true })`
  - Secondary: "Just keep the photos in my library" → `onComplete({ ...summary, replicate: false })`
- When not `canReplicate`: existing single "Go to my studio" flow, `replicate: false`.
- Copy: plain prose, no em-dashes (a tour test enforces the no-em-dash rule for tour copy; keep the same voice here), reassure reversibility: "You can edit or delete anything we create."
- Keep `onImportAnother` behavior untouched.

- [ ] **Step 1: Write failing tests** in `__tests__/components/ImportDoneStep.test.js` (keep all existing tests green; follow the file's existing render/mocking style):

```js
const siteMapSummary = {
  importedCount: 12, failedCount: 0, setsCount: 2,
  site: { title: 'Jane' },
  imported: [{ assetId: 'a1', source: { externalCollectionId: 'c1' } }],
  collections: [{ id: 'c1', name: 'Portraits', assetRefs: [{ remoteUrl: 'u' }] }],
  siteMap: { pages: [
    { kind: 'gallery', title: 'Portraits', collectionId: 'c1' },
    { kind: 'about', title: 'About', collectionId: 'about' },
  ] },
}

it('offers the rebuild choice when site structure was found', () => {
  const onEnter = jest.fn()
  render(<ImportDoneStep summary={siteMapSummary} onEnter={onEnter} />)
  fireEvent.click(screen.getByRole('button', { name: /rebuild these pages/i }))
  expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: true }))
})

it('lets the user keep photos library-only', () => {
  const onEnter = jest.fn()
  render(<ImportDoneStep summary={siteMapSummary} onEnter={onEnter} />)
  fireEvent.click(screen.getByRole('button', { name: /keep the photos/i }))
  expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: false }))
})

it('shows no rebuild choice without a site map', () => {
  render(<ImportDoneStep summary={{ importedCount: 3, siteMap: null }} onEnter={jest.fn()} />)
  expect(screen.queryByRole('button', { name: /rebuild/i })).toBeNull()
})
```

Note the contract change these tests imply: `onEnter` now receives an options object `{ replicate }` (ImportDoneStep does not need the whole summary spread; ImportFlow merges). Adjust existing tests that call `onEnter` with no args accordingly (assert it was called; if they assert call shape, update to the new contract).

- [ ] **Step 2: Run to verify failure**, then implement: ImportDoneStep computes `canReplicate` and the found-structure description from `summary.siteMap.pages` (gallery count restricted to pages whose `collectionId` matches a collection with imported assets — derive from `summary.imported[].source.externalCollectionId`); renders the two-button choice or the existing single button; fires `onEnter({ replicate })`. ImportFlow: `onEnter={(opts) => onComplete({ ...summary, replicate: !!opts?.replicate })}`.

- [ ] **Step 3: Gate the handlers.** In `pages/onboarding.js` and `components/admin/AdminLibrary.js`, change the composition guard from `if (summary.siteMap?.pages?.length)` to `if (summary.replicate && summary.siteMap?.pages?.length)`. Library merge (assets + sets) continues unconditionally.

- [ ] **Step 4: Run** `npx jest __tests__/components/ImportDoneStep.test.js`, then full `npx jest` → all green.

- [ ] **Step 5: Commit** — `feat(import): make page replication an opt-in choice on the import done screen`
