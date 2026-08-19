# Import Structural Replication (v1, rules-first) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a photographer imports a site and chooses "Build my pages for me," replicate each source page's *block structure* (captioned photos, side captions, testimonials, headings, essays, link-cards, 2-ups) and page nesting — using a deterministic, keyless, zero-cost mapper — instead of synthesizing a generic gallery.

**Architecture:** Discovery gains a deterministic ordered per-page **outline**. During rebuild, a page is classified **designed** or **gallery**; designed pages run a pure **rules mapper** (`mapOutlineToBlocks`) that emits a block plan referencing image placeholders, which is validated against the real block registry and bound to imported assets; gallery pages keep the capped deterministic composer. Nesting and link-cards are resolved from URL paths. The mapper sits behind a stable `mapOutlineToBlocks(outline)` interface so a later AI implementation drops in without touching the pipeline.

**Tech Stack:** Next.js (pages router), JavaScript (ESM, `@/` path alias), Jest (`__tests__/`), cheerio (HTML parsing, already a dep).

**Spec:** `docs/designs/2026-08-18-import-structural-replication-design.md`

## Global Constraints

- **Keyless, zero-cost v1.** No network calls, no API key, no new runtime dependency. The AI mapper (`aiMapper`) is a **separate future plan**; this plan ships the `rulesMapper` only, behind the shared interface.
- **Theme-independent storage.** Blocks store theme-independent hints (flat legacy fields like `variant`/`layout`, `caption`), never per-theme `themeState`. The theme resolves presentation. (Editing invariant.)
- **Pure functions stay pure.** `composeSite`, the mapper, and all helpers remain synchronous and side-effect-free so they run client-side exactly where `composeSite` runs today (`AdminLibrary.js`, `pages/onboarding.js`) with no route change.
- **Never a broken page.** Any classification miss, empty/invalid mapper output, or unresolved reference degrades to the capped gallery fallback — the import never fails.
- **Test env:** import-logic tests use `/** @jest-environment node */` (see existing `__tests__/import/*.test.js`); component tests use jsdom (default).
- **Real registry is the source of truth:** block types/defaults from `common/blocks.js` (`defaultBlock`), variants from `common/themes/base.js` + `common/themes/variants.js`. Never invent a type or variant.

## File Structure

**Create:**
- `common/import/blockSchema.js` — the model-facing/mapper-facing block vocabulary + `validateBlocks(blocks)` (coerce/drop against the real registry).
- `common/import/rulesMapper.js` — `mapOutlineToBlocks(outline)` deterministic implementation.
- `common/import/mapper.js` — `mapOutlineToBlocks(outline)` dispatch (v1: always rules; the AI seam).
- `components/admin/import/ImportRebuildProgress.js` — the narrated reveal interstitial.
- Tests: `__tests__/import/blockSchema.test.js`, `rulesMapper.test.js`, `layoutClassify.test.js`, `bindAssets.test.js`, `nesting.test.js`, `pageLinks.test.js`, `outline.test.js`, `structuralReplication.golden.test.js`; `__tests__/components/ImportRebuildProgress.test.js`.

**Modify:**
- `common/themes/variants.js` — extend `LEGACY.photo` so `variant: 3` → `side-by-side` (theme-independent side caption).
- `common/import/crawlerUtils.js` — add `extractPageOutline(html, baseUrl)`.
- `common/import/adapters/generic.js` — call `extractPageOutline` per page; thread `outline` into `pageRecords`.
- `common/import/siteMap.js` — copy `outline` onto each site-map page.
- `common/import/composer.js` — add `classifyLayout`, `bindAssets`, `setParentIds`, `resolvePageLinks`; cap `composeGalleryBlocks`; integrate the mapper into `composeSite`.
- `components/admin/import/ImportFlow.js` — insert the reveal step on "Build my pages for me".

## Interfaces (locked signatures — every task consumes/produces these exactly)

```js
// crawlerUtils.js
extractPageOutline(html, baseUrl) -> OutlineNode[]
// OutlineNode is one of:
//   { kind: 'image', ref: 'img-N', src: string, caption: string }
//   { kind: 'heading', level: 1|2|3, text: string }
//   { kind: 'paragraph', text: string }
//   { kind: 'quote', text: string, attribution: string }   // attribution '' when absent
//   { kind: 'linkcards', items: [{ href: string, label: string }] }
//   { kind: 'video', url: string }
// `ref` is 'img-1','img-2',... assigned in document order across image nodes only.

// siteMap.js — buildSiteMap adds `outline` to each page (from pageRecords[i].outline)
//   page: { ...existing, outline: OutlineNode[] }

// blockSchema.js
validateBlocks(blocks) -> Block[]            // coerce invalid variants, drop unknown/empty blocks
isEmittableType(type) -> boolean

// rulesMapper.js  (and mapper.js re-exports the same signature)
mapOutlineToBlocks(outline) -> { blocks: Block[], confidence: number }
// Emitted Block shapes (pre-bind; images carry `ref`, not urls):
//   { type:'photo', ref, caption }                      // caption '' allowed
//   { type:'photo', ref, caption, variant: 3 }          // side caption
//   { type:'photos', refs: string[], layout: 'stacked'|'masonry' }
//   { type:'text', variant: 1, content }                // heading
//   { type:'text', variant: 3, format:'markdown', content } // essay
//   { type:'testimonial', text, name, ref }             // ref optional (avatar)
//   { type:'page-gallery', source:'manual', pageIds: [], pageRefs: string[] } // pageRefs = source hrefs
//   { type:'video', url }

// composer.js
classifyLayout(outline) -> 'designed' | 'gallery'
bindAssets(blocks, outline, pageAssets) -> Block[]   // ref->src (from outline) -> asset (by image identity); fills imageUrl/imageUrls/images; drops unresolved refs
setParentIds(pages) -> void                          // mutates page.parentId by sourceUrl path
resolvePageLinks(pages) -> void                      // mutates page-gallery blocks: pageRefs -> pageIds; drops dead
// composeSite(...) integrates all of the above; signature unchanged.
```

---

### Task 1: Theme-independent "side-by-side" photo variant

Side captions have no theme-independent encoding today (`LEGACY.photo` only yields full-bleed/centered). Add `variant: 3` → `side-by-side`, matching the numbering `video` already uses (`1: full-bleed, 2: centered, 3: side-by-side`). Existing stored photos never use `variant: 3`, so this is additive and safe.

**Files:**
- Modify: `common/themes/variants.js:9-14` (`LEGACY.photo`)
- Test: `__tests__/themes/photoVariant.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: a photo block with flat `variant: 3` resolves to `'side-by-side'` on themes that offer it.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { resolveVariant } from '@/common/themes/variants'

// Kyoto is the default theme and offers the base photo variants incl. side-by-side.
describe('LEGACY.photo variant numbering', () => {
  it('maps flat variant 3 to side-by-side', () => {
    expect(resolveVariant({ type: 'photo', variant: 3 }, 'kyoto')).toBe('side-by-side')
  })
  it('keeps variant 2 → centered and variant 1 → full-bleed', () => {
    expect(resolveVariant({ type: 'photo', variant: 2 }, 'kyoto')).toBe('centered')
    expect(resolveVariant({ type: 'photo', variant: 1 }, 'kyoto')).toBe('full-bleed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/themes/photoVariant.test.js`
Expected: FAIL — variant 3 resolves to `full-bleed` (current behavior).

- [ ] **Step 3: Implement**

Replace the `LEGACY.photo` function in `common/themes/variants.js` with explicit numbering that mirrors `video`:

```js
  photo: (b) =>
    b.variant === 3
      ? 'side-by-side'
      : b.layout === 'Centered' || b.variant === 2
        ? 'centered'
        : b.layout || b.variant
          ? 'full-bleed'
          : null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/themes/photoVariant.test.js`
Expected: PASS. Also run `npx jest __tests__/` for the variant/theme suites to confirm no regression.

- [ ] **Step 5: Commit**

```bash
git add common/themes/variants.js __tests__/themes/photoVariant.test.js
git commit -m "feat(themes): map flat photo variant 3 to side-by-side (theme-independent side captions)"
```

---

### Task 2: Ordered page outline extraction

Add `extractPageOutline(html, baseUrl)` to the crawler: walk the content scope in document order and emit typed nodes (image+caption, heading, paragraph, quote, link-cards, video). This is the deterministic signal the rules mapper reads. Free; no network.

**Files:**
- Modify: `common/import/crawlerUtils.js` (add export near `extractPageContent`)
- Test: `__tests__/import/outline.test.js` (create)

**Interfaces:**
- Consumes: cheerio (already imported at top of `crawlerUtils.js`), `safeResolve` (already in file).
- Produces: `extractPageOutline(html, baseUrl) -> OutlineNode[]` per the Interfaces block.

- [ ] **Step 1: Write the failing test**

```js
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
    expect(imgs.map((n) => n.ref)).toEqual(['img-1', 'img-2', 'img-3', 'img-4'])
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/outline.test.js`
Expected: FAIL — `extractPageOutline is not a function`.

- [ ] **Step 3: Implement**

Add to `common/import/crawlerUtils.js` (uses the existing `safeResolve` and `cheerio`):

```js
// Ordered, typed content outline for a page — the deterministic signal the
// structural mapper reads. Document order is preserved; image nodes get stable
// `img-N` refs so a mapper can reference an image without handling its URL.
export function extractPageOutline(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  $('script, style, noscript, nav, header, footer, svg').remove()
  const scope = $('main').length ? $('main').first() : $('body')
  const nodes = []
  let imgN = 0
  const captionFor = (el) => {
    const fig = $(el).closest('figure')
    const cap = fig.length ? fig.find('figcaption').first().text() : ''
    return (cap || $(el).attr('alt') || $(el).attr('title') || '').replace(/\s+/g, ' ').trim()
  }
  // A "card" is an <a> that wraps an <img> and points at a same-page-family URL.
  const cardGroups = []
  $('a').each((_, a) => {
    const $a = $(a)
    if (!$a.find('img').length) return
    const href = safeResolve($a.attr('href'), baseUrl)
    if (!href) return
    const label = $a.text().replace(/\s+/g, ' ').trim()
    const parentKey = $a.parent().index() + ':' + ($a.parent().prop('tagName') || '')
    let group = cardGroups.find((g) => g.key === parentKey)
    if (!group) { group = { key: parentKey, items: [], anchor: a }; cardGroups.push(group) }
    group.items.push({ href: href.split('#')[0], label })
  })
  const cardAnchorSet = new Set()
  for (const g of cardGroups) if (g.items.length >= 2) cardAnchorSet.add(g.anchor)

  scope.find('img, h1, h2, h3, p, blockquote, a').each((_, el) => {
    const tag = (el.tagName || '').toLowerCase()
    if (tag === 'img') {
      // skip images that belong to a link-card group (handled below)
      if ($(el).closest('a').get(0) && cardAnchorSet.has($(el).closest('a').get(0))) return
      const src = safeResolve($(el).attr('src') || $(el).attr('data-src'), baseUrl)
      if (!src || src.startsWith('data:')) return
      imgN += 1
      nodes.push({ kind: 'image', ref: `img-${imgN}`, src, caption: captionFor(el) })
    } else if (tag === 'a') {
      if (!cardAnchorSet.has(el)) return
      const g = cardGroups.find((gr) => gr.anchor === el)
      if (g && !nodes.some((n) => n.kind === 'linkcards' && n._key === g.key)) {
        nodes.push({ kind: 'linkcards', _key: g.key, items: g.items })
      }
    } else if (tag === 'blockquote') {
      const cite = $(el).find('cite').first().text().replace(/\s+/g, ' ').trim()
      const text = $(el).clone().find('cite').remove().end().text().replace(/\s+/g, ' ').trim()
      if (text) nodes.push({ kind: 'quote', text, attribution: cite })
    } else if (tag === 'p') {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text) nodes.push({ kind: 'paragraph', text })
    } else {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text) nodes.push({ kind: 'heading', level: Number(tag[1]), text })
    }
  })
  return nodes.map(({ _key, ...n }) => n)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/outline.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/crawlerUtils.js __tests__/import/outline.test.js
git commit -m "feat(import): extract an ordered per-page content outline"
```

---

### Task 3: Thread the outline through discovery into the site map

Produce the outline during the crawl and carry it onto each site-map page so it reaches `composeSite`. No behavior change to existing flows — a new field alongside `text`.

**Files:**
- Modify: `common/import/adapters/generic.js:102-112` (import + `pageRecords.push`)
- Modify: `common/import/siteMap.js:29-54` (`buildSiteMap` — add `outline` to each page)
- Test: `__tests__/import/siteMap.test.js` (extend), `__tests__/import/generic.test.js` (extend)

**Interfaces:**
- Consumes: `extractPageOutline` (Task 2).
- Produces: `siteMap.pages[i].outline: OutlineNode[]` (defaults to `[]`).

- [ ] **Step 1: Write the failing test** (extend `__tests__/import/siteMap.test.js`)

```js
/** @jest-environment node */
import { buildSiteMap } from '@/common/import/siteMap'

it('carries a page outline onto the site-map page', () => {
  const outline = [{ kind: 'heading', level: 1, text: 'Portfolio' }]
  const { pages } = buildSiteMap({
    pageRecords: [{ url: 'https://x.com/portfolio', title: 'Portfolio', wordCount: 300, imageCount: 5, text: 'hi', outline }],
    origin: 'https://x.com',
    navLinks: [],
  })
  expect(pages[0].outline).toEqual(outline)
})

it('defaults outline to an empty array when absent', () => {
  const { pages } = buildSiteMap({
    pageRecords: [{ url: 'https://x.com/g', title: 'G', wordCount: 0, imageCount: 10, text: '' }],
    origin: 'https://x.com',
    navLinks: [],
  })
  expect(pages[0].outline).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/siteMap.test.js`
Expected: FAIL — `pages[0].outline` is `undefined`.

- [ ] **Step 3: Implement**

In `common/import/siteMap.js`, inside the `pages.push({...})` in `buildSiteMap`, add:

```js
      outline: rec.outline || [],
```

In `common/import/adapters/generic.js`, import `extractPageOutline` and populate it. Update the import line:

```js
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls, extractPageContent, extractNavLinks, extractVideoUrls, extractPageOutline } from '../crawlerUtils'
```

and add `outline` to the `pageRecords.push({...})`:

```js
      outline: extractPageOutline(html, pageUrl),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/siteMap.test.js __tests__/import/generic.test.js`
Expected: PASS (extend `generic.test.js` with an assertion that a crawled page record/site-map page carries a non-empty `outline` when the HTML has content — mirror an existing generic-test fixture).

- [ ] **Step 5: Commit**

```bash
git add common/import/siteMap.js common/import/adapters/generic.js __tests__/import/siteMap.test.js __tests__/import/generic.test.js
git commit -m "feat(import): thread page outline through discovery into the site map"
```

---

### Task 4: Block-schema contract + validation

A single module that (a) declares which block types/variants a mapper may emit and (b) validates/coerces a block list against the **real** registry so a bad plan can never render garbage. A drift test asserts every emittable type exists in `defaultBlock`.

**Files:**
- Create: `common/import/blockSchema.js`
- Test: `__tests__/import/blockSchema.test.js`

**Interfaces:**
- Consumes: `defaultBlock` from `@/common/blocks`.
- Produces: `validateBlocks(blocks)`, `isEmittableType(type)`, `EMITTABLE_TYPES`.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { validateBlocks, isEmittableType, EMITTABLE_TYPES } from '@/common/import/blockSchema'
import { defaultBlock } from '@/common/blocks'

describe('blockSchema', () => {
  it('every emittable type is a real block (drift guard)', () => {
    for (const t of EMITTABLE_TYPES) expect(defaultBlock(t).type).toBe(t)
  })
  it('drops blocks of unknown type', () => {
    expect(validateBlocks([{ type: 'carousel' }, { type: 'photo', imageUrl: 'u' }]))
      .toEqual([{ type: 'photo', imageUrl: 'u' }])
  })
  it('drops an empty photo (no imageUrl) and an empty photos block', () => {
    expect(validateBlocks([{ type: 'photo', imageUrl: '' }, { type: 'photos', imageUrls: [] }])).toEqual([])
  })
  it('drops a testimonial with no text', () => {
    expect(validateBlocks([{ type: 'testimonial', text: '' }])).toEqual([])
  })
  it('coerces an out-of-range photo variant to undefined (theme default)', () => {
    const [b] = validateBlocks([{ type: 'photo', imageUrl: 'u', variant: 9 }])
    expect(b.variant).toBeUndefined()
  })
  it('keeps valid photo/text/testimonial/photos/video/page-gallery blocks', () => {
    const blocks = [
      { type: 'photo', imageUrl: 'u', variant: 3, caption: 'c' },
      { type: 'text', variant: 1, content: 'H' },
      { type: 'photos', imageUrls: ['a', 'b'], images: [{ url: 'a' }, { url: 'b' }], layout: 'stacked' },
      { type: 'video', url: 'v' },
      { type: 'page-gallery', source: 'manual', pageIds: ['p1'] },
    ]
    expect(validateBlocks(blocks)).toEqual(blocks)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/blockSchema.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `common/import/blockSchema.js`

```js
import { defaultBlock } from '@/common/blocks'

// Types a structural mapper may emit. Each must be a real block in defaultBlock.
export const EMITTABLE_TYPES = ['photo', 'photos', 'text', 'testimonial', 'video', 'page-gallery']

// Flat, theme-independent variant values a mapper may set (resolved by
// common/themes/variants.js LEGACY). Anything else is coerced to undefined so
// the theme's default wins.
const VALID_VARIANTS = {
  photo: new Set([1, 2, 3]),      // full-bleed / centered / side-by-side
  text: new Set([1, 2, 3, 4]),    // heading / subheading / body / quote
  testimonial: new Set([1, 2]),   // photo-above / quote-above
}

export function isEmittableType(type) {
  return EMITTABLE_TYPES.includes(type)
}

function isEmpty(b) {
  if (b.type === 'photo') return !b.imageUrl
  if (b.type === 'photos') return !(b.imageUrls && b.imageUrls.length)
  if (b.type === 'text') return !String(b.content || '').trim()
  if (b.type === 'testimonial') return !String(b.text || '').trim()
  if (b.type === 'video') return !b.url
  if (b.type === 'page-gallery') return !(b.pageIds && b.pageIds.length)
  return true
}

export function validateBlocks(blocks) {
  const out = []
  for (const b of blocks || []) {
    if (!b || !isEmittableType(b.type)) continue
    const block = { ...b }
    const valid = VALID_VARIANTS[block.type]
    if ('variant' in block && valid && !valid.has(block.variant)) delete block.variant
    if (isEmpty(block)) continue
    out.push(block)
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/blockSchema.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/blockSchema.js __tests__/import/blockSchema.test.js
git commit -m "feat(import): block-schema contract with registry-checked validation"
```

---

### Task 5: Rules mapper (`mapOutlineToBlocks`)

The deterministic engine: turn an outline into an ordered block plan. Images carry `ref` (not URLs); binding happens later. Reports `confidence`: high when it recognized structure, low when the page was essentially unclassified images (routing to the gallery fallback).

**Files:**
- Create: `common/import/rulesMapper.js`
- Create: `common/import/mapper.js` (dispatch; v1 delegates to rules)
- Test: `__tests__/import/rulesMapper.test.js`

**Interfaces:**
- Consumes: nothing (pure over the outline).
- Produces: `mapOutlineToBlocks(outline) -> { blocks, confidence }` (both `rulesMapper.js` and `mapper.js` export this signature). Emitted block shapes per the Interfaces block.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { mapOutlineToBlocks } from '@/common/import/rulesMapper'

it('maps a captioned image to a photo block carrying the ref and caption', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'image', ref: 'img-1', src: 'a', caption: 'SF in fog' }])
  expect(blocks).toEqual([{ type: 'photo', ref: 'img-1', caption: 'SF in fog' }])
})

it('maps an image immediately followed by a short standalone paragraph to a side caption', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'paragraph', text: 'Aurora Borealis in California — a rare shot.' },
  ])
  expect(blocks[0]).toMatchObject({ type: 'photo', ref: 'img-1', variant: 3, caption: 'Aurora Borealis in California — a rare shot.' })
  expect(blocks).toHaveLength(1)
})

it('maps a blockquote to a testimonial', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'quote', text: 'Amazing.', attribution: 'Vivek' }])
  expect(blocks).toEqual([{ type: 'testimonial', text: 'Amazing.', name: 'Vivek', ref: null }])
})

it('maps a heading to a text heading and a paragraph run to a markdown essay', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'heading', level: 2, text: 'Recent Work' },
    { kind: 'paragraph', text: 'One.' },
    { kind: 'paragraph', text: 'Two.' },
  ])
  expect(blocks[0]).toEqual({ type: 'text', variant: 1, content: 'Recent Work' })
  expect(blocks[1]).toEqual({ type: 'text', variant: 3, format: 'markdown', content: 'One.\n\nTwo.' })
})

it('maps consecutive portrait-less images into a photos grid, keeping refs', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: '' },
  ])
  expect(blocks).toEqual([{ type: 'photos', refs: ['img-1', 'img-2'], layout: 'stacked' }])
})

it('maps a linkcards node to a page-gallery with source hrefs in pageRefs', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'linkcards', items: [{ href: 'https://x.com/a', label: 'A' }, { href: 'https://x.com/b', label: 'B' }] },
  ])
  expect(blocks).toEqual([{ type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: ['https://x.com/a', 'https://x.com/b'] }])
})

it('reports low confidence for an images-only outline', () => {
  const { confidence } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: '' },
  ])
  expect(confidence).toBeLessThan(0.5)
})

it('reports high confidence when it recognized non-image structure', () => {
  const { confidence } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: 'c' },
    { kind: 'quote', text: 'q', attribution: '' },
  ])
  expect(confidence).toBeGreaterThanOrEqual(0.5)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/rulesMapper.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `common/import/rulesMapper.js`

```js
// Deterministic outline -> block plan. Images are referenced by `ref`; asset
// binding happens downstream. Groups consecutive bare images into a photos
// block; a single image + a short trailing paragraph becomes a side caption.
const MAX_PER_PHOTOS = 9

function flushImages(refs, out) {
  if (!refs.length) return
  if (refs.length === 1) { out.push({ type: 'photo', ref: refs[0], caption: '' }); refs.length = 0; return }
  for (let i = 0; i < refs.length; i += MAX_PER_PHOTOS) {
    out.push({ type: 'photos', refs: refs.slice(i, i + MAX_PER_PHOTOS), layout: 'stacked' })
  }
  refs.length = 0
}

export function mapOutlineToBlocks(outline) {
  const nodes = outline || []
  const out = []
  const pending = [] // buffered consecutive bare images
  let recognized = 0

  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]
    if (n.kind === 'image') {
      const next = nodes[i + 1]
      // image + short standalone caption paragraph => side caption
      if (!n.caption && next && next.kind === 'paragraph' && next.text.length <= 160 &&
          (!nodes[i + 2] || nodes[i + 2].kind !== 'paragraph')) {
        flushImages(pending, out)
        out.push({ type: 'photo', ref: n.ref, variant: 3, caption: next.text })
        recognized += 1
        i += 1
        continue
      }
      if (n.caption) { flushImages(pending, out); out.push({ type: 'photo', ref: n.ref, caption: n.caption }); recognized += 1; continue }
      pending.push(n.ref)
      continue
    }
    flushImages(pending, out)
    if (n.kind === 'heading') { out.push({ type: 'text', variant: 1, content: n.text }); recognized += 1 }
    else if (n.kind === 'paragraph') {
      const parts = [n.text]
      while (nodes[i + 1] && nodes[i + 1].kind === 'paragraph') { parts.push(nodes[i + 1].text); i += 1 }
      out.push({ type: 'text', variant: 3, format: 'markdown', content: parts.join('\n\n') })
      recognized += 1
    } else if (n.kind === 'quote') { out.push({ type: 'testimonial', text: n.text, name: n.attribution || '', ref: null }); recognized += 1 }
    else if (n.kind === 'linkcards') { out.push({ type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: n.items.map((it) => it.href) }); recognized += 1 }
    else if (n.kind === 'video') { out.push({ type: 'video', url: n.url }); recognized += 1 }
  }
  flushImages(pending, out)

  const nonImage = nodes.filter((n) => n.kind !== 'image').length
  const confidence = nodes.length === 0 ? 0 : Math.min(1, (recognized + nonImage) / Math.max(1, nodes.length))
  return { blocks: out, confidence }
}
```

Create `common/import/mapper.js` (the dispatch seam; v1 always rules):

```js
import { mapOutlineToBlocks as rulesMap } from './rulesMapper'

// The structural mapper interface. v1 has one implementation (deterministic
// rules, keyless). A future AI implementation plugs in here behind the same
// signature, selected by IMPORT_MAPPER / key presence.
export function mapOutlineToBlocks(outline) {
  return rulesMap(outline)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/rulesMapper.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/rulesMapper.js common/import/mapper.js __tests__/import/rulesMapper.test.js
git commit -m "feat(import): deterministic rules mapper behind mapOutlineToBlocks interface"
```

---

### Task 6: Designed-vs-gallery classifier

`classifyLayout(outline)` decides whether a page gets structural mapping or the flat gallery treatment. A page is `gallery` when it is essentially images only.

**Files:**
- Modify: `common/import/composer.js` (add + export `classifyLayout`)
- Test: `__tests__/import/layoutClassify.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `classifyLayout(outline) -> 'designed' | 'gallery'`.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { classifyLayout } from '@/common/import/composer'

const img = (n) => ({ kind: 'image', ref: `img-${n}`, src: `s${n}`, caption: '' })

it('classifies an images-only outline as gallery', () => {
  expect(classifyLayout([img(1), img(2), img(3), img(4)])).toBe('gallery')
})
it('classifies images + a single lead-in blurb as gallery', () => {
  expect(classifyLayout([{ kind: 'paragraph', text: 'A short intro.' }, img(1), img(2)])).toBe('gallery')
})
it('classifies an outline with a quote as designed', () => {
  expect(classifyLayout([img(1), { kind: 'quote', text: 'q', attribution: '' }, img(2)])).toBe('designed')
})
it('classifies an outline with link cards as designed', () => {
  expect(classifyLayout([img(1), { kind: 'linkcards', items: [{ href: 'a', label: 'A' }] }])).toBe('designed')
})
it('classifies interleaved prose between images as designed', () => {
  expect(classifyLayout([img(1), { kind: 'paragraph', text: 'x' }, img(2), { kind: 'paragraph', text: 'y' }])).toBe('designed')
})
it('classifies an empty outline as gallery', () => {
  expect(classifyLayout([])).toBe('gallery')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/layoutClassify.test.js`
Expected: FAIL — `classifyLayout is not a function`.

- [ ] **Step 3: Implement** — add to `common/import/composer.js`:

```js
// A page is a flat "gallery" when it is essentially images only: no quotes, no
// link-cards, no captions, and at most one lead-in paragraph before the images
// (a gallery blurb). Anything else — interleaved prose, section headings that
// break the images, quotes, cards — is a "designed" page we replicate.
export function classifyLayout(outline) {
  const nodes = outline || []
  if (!nodes.length) return 'gallery'
  if (nodes.some((n) => n.kind === 'quote' || n.kind === 'linkcards')) return 'designed'
  if (nodes.some((n) => n.kind === 'image' && n.caption)) return 'designed'
  const firstImage = nodes.findIndex((n) => n.kind === 'image')
  const proseAfterImages = nodes.some((n, i) => (n.kind === 'paragraph' || n.kind === 'heading') && firstImage !== -1 && i > firstImage)
  if (proseAfterImages) return 'designed'
  return 'gallery'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/layoutClassify.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/composer.js __tests__/import/layoutClassify.test.js
git commit -m "feat(import): classify pages as designed vs gallery from the outline"
```

---

### Task 7: Bind refs to imported assets

`bindAssets(blocks, outline, pageAssets)` turns the ref-carrying plan into renderable blocks: resolve each `ref` → the outline node's `src` → the imported asset for this page, matched by **image identity** (handles CDN size-variant mismatch between the outline's raw `<img src>` and the collapsed asset URL). Fills `imageUrl` (photo/testimonial avatar) and `images`/`imageUrls` (photos). Drops refs that don't resolve; drops blocks left empty.

**Files:**
- Modify: `common/import/composer.js` (add + export `bindAssets`; import `imageIdentity`)
- Test: `__tests__/import/bindAssets.test.js`

**Interfaces:**
- Consumes: `imageIdentity` from `./originalUrl`; `validateBlocks` from `./blockSchema`.
- Produces: `bindAssets(blocks, outline, pageAssets) -> Block[]`. `pageAssets` are asset records (`{ assetId, publicUrl, source: { sourceUrl } }`).

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { bindAssets } from '@/common/import/composer'

const asset = (id, sourceUrl) => ({ assetId: id, publicUrl: `https://gcs/${id}.jpg`, source: { sourceUrl } })

it('resolves a photo ref to the imported asset imageUrl and keeps the caption', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://x.com/a.jpg', caption: 'c' }]
  const blocks = [{ type: 'photo', ref: 'img-1', caption: 'c' }]
  const assets = [asset('a', 'https://x.com/a.jpg')]
  expect(bindAssets(blocks, outline, assets)).toEqual([{ type: 'photo', imageUrl: 'https://gcs/a.jpg', caption: 'c' }])
})

it('matches by image identity across CDN size variants', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://cdn/i-abc/S/photo.jpg', caption: '' }]
  const blocks = [{ type: 'photo', ref: 'img-1', caption: '' }]
  const assets = [asset('a', 'https://cdn/i-abc/O/photo.jpg')] // larger variant, same identity
  const [b] = bindAssets(blocks, outline, assets)
  expect(b.imageUrl).toBe('https://gcs/a.jpg')
})

it('fills a photos block images/imageUrls from refs and drops unresolved refs', () => {
  const outline = [
    { kind: 'image', ref: 'img-1', src: 'https://x.com/a.jpg', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'https://x.com/missing.jpg', caption: '' },
  ]
  const blocks = [{ type: 'photos', refs: ['img-1', 'img-2'], layout: 'stacked' }]
  const assets = [asset('a', 'https://x.com/a.jpg')]
  const [b] = bindAssets(blocks, outline, assets)
  expect(b.imageUrls).toEqual(['https://gcs/a.jpg'])
  expect(b.images).toEqual([{ url: 'https://gcs/a.jpg', assetId: 'a' }])
  expect(b.refs).toBeUndefined()
})

it('drops a photo whose ref resolves to nothing', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://x.com/gone.jpg', caption: '' }]
  const blocks = [{ type: 'photo', ref: 'img-1', caption: '' }]
  expect(bindAssets(blocks, outline, [])).toEqual([])
})

it('binds a testimonial avatar ref and passes text blocks through untouched', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://x.com/face.jpg', caption: '' }]
  const blocks = [
    { type: 'testimonial', text: 'Great', name: 'Naga', ref: 'img-1' },
    { type: 'text', variant: 1, content: 'Recent Work' },
  ]
  const [t, txt] = bindAssets(blocks, outline, [asset('f', 'https://x.com/face.jpg')])
  expect(t).toEqual({ type: 'testimonial', text: 'Great', name: 'Naga', imageUrl: 'https://gcs/f.jpg', variant: 1 })
  expect(txt).toEqual({ type: 'text', variant: 1, content: 'Recent Work' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/bindAssets.test.js`
Expected: FAIL — `bindAssets is not a function`.

- [ ] **Step 3: Implement** — add to `common/import/composer.js` (add imports at top):

```js
import { imageIdentity } from './originalUrl'
import { validateBlocks } from './blockSchema'
```

```js
// Resolve each block's `ref` to a real imported asset for this page. Matching is
// by image identity (CDN size variants of the same photo collapse to one), so
// the outline's raw <img src> still binds to the collapsed asset URL. Refs that
// don't resolve are dropped; blocks left empty are dropped by validateBlocks.
export function bindAssets(blocks, outline, pageAssets) {
  const srcByRef = new Map((outline || []).filter((n) => n.kind === 'image').map((n) => [n.ref, n.src]))
  const assetByIdentity = new Map()
  for (const a of pageAssets || []) {
    const u = a?.source?.sourceUrl
    if (u) assetByIdentity.set(imageIdentity(u), a)
  }
  const assetForRef = (ref) => {
    const src = srcByRef.get(ref)
    return src ? assetByIdentity.get(imageIdentity(src)) : undefined
  }

  const bound = []
  for (const b of blocks || []) {
    if (b.type === 'photo') {
      const a = assetForRef(b.ref)
      if (!a) continue
      bound.push({ type: 'photo', imageUrl: a.publicUrl, caption: b.caption || '', ...(b.variant ? { variant: b.variant } : {}) })
    } else if (b.type === 'photos') {
      const assets = (b.refs || []).map(assetForRef).filter(Boolean)
      if (!assets.length) continue
      bound.push({ type: 'photos', layout: b.layout || 'stacked',
        images: assets.map((a) => ({ url: a.publicUrl, assetId: a.assetId })),
        imageUrls: assets.map((a) => a.publicUrl) })
    } else if (b.type === 'testimonial') {
      const a = b.ref ? assetForRef(b.ref) : null
      bound.push({ type: 'testimonial', text: b.text, name: b.name || '', imageUrl: a ? a.publicUrl : '', variant: 1 })
    } else if (b.type === 'text' || b.type === 'video' || b.type === 'page-gallery') {
      const { ref, refs, ...rest } = b
      bound.push(rest)
    }
  }
  return validateBlocks(bound)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/bindAssets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/composer.js __tests__/import/bindAssets.test.js
git commit -m "feat(import): bind mapper refs to imported assets by image identity"
```

---

### Task 8: Cap the gallery fallback at 9 per block

Tighten `composeGalleryBlocks` so no synthesized `photos` block exceeds 9 images. The existing masonry(10)/stacked(6) rotation is adjusted; the opener + solo rhythm is preserved.

**Files:**
- Modify: `common/import/composer.js:5-63` (`MASONRY_RUN`, and the tail-fold guard)
- Test: `__tests__/import/composer.test.js` (extend)

**Interfaces:**
- Consumes: nothing new.
- Produces: `composeGalleryBlocks` output where every `photos` block has `imageUrls.length <= 9`.

- [ ] **Step 1: Write the failing test** (extend `__tests__/import/composer.test.js`)

```js
it('caps every synthesized photos block at 9 images', () => {
  const { siteMap, collections, imported } = fixture(40)
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  for (const b of pages[0].blocks) {
    if (b.type === 'photos') expect(b.imageUrls.length).toBeLessThanOrEqual(9)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/composer.test.js -t "caps every"`
Expected: FAIL — the masonry run is 10.

- [ ] **Step 3: Implement** — in `common/import/composer.js`, change:

```js
const MASONRY_RUN = 9
```

and in the tail-fold branch of `composeGalleryBlocks`, split an over-cap fold so a folded tail never pushes a block past 9:

```js
      const lastPhotos = [...blocks].reverse().find((b) => b.type === 'photos')
      if (lastPhotos && lastPhotos.images.length + rest.length <= 9) {
        lastPhotos.images.push(...rest.map((a) => ({ url: a.publicUrl, assetId: a.assetId })))
        lastPhotos.imageUrls.push(...rest.map((a) => a.publicUrl))
        rest.length = 0
      } else {
        blocks.push(photosBlock(rest.splice(0), 'masonry'))
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/composer.test.js`
Expected: PASS (existing composer tests still green — the "every asset placed exactly once" test at n=20 remains valid; verify the count assertion).

- [ ] **Step 5: Commit**

```bash
git add common/import/composer.js __tests__/import/composer.test.js
git commit -m "feat(import): cap synthesized gallery photos blocks at 9 images"
```

---

### Task 9: Integrate the mapper into `composeSite`

For gallery-kind pages, branch on `classifyLayout(page.outline)`: **designed** → `mapOutlineToBlocks` → `bindAssets` → fallback to `composeGalleryBlocks` when the plan is empty or confidence is low; **gallery** → `composeGalleryBlocks` as today. About/contact unchanged.

**Files:**
- Modify: `common/import/composer.js:142-169` (the gallery branch inside `composeSite`)
- Test: `__tests__/import/composer.test.js` (extend)

**Interfaces:**
- Consumes: `classifyLayout` (Task 6), `mapOutlineToBlocks` from `./mapper` (Task 5), `bindAssets` (Task 7).
- Produces: `composeSite` returns designed pages with mapped blocks; gallery pages unchanged.

- [ ] **Step 1: Write the failing test** (extend `__tests__/import/composer.test.js`)

```js
it('replicates a designed page structure instead of a synthesized gallery', () => {
  const collections = [{ id: 'c1', name: 'Portfolio', assetRefs: [
    { remoteUrl: 'https://x.com/a.jpg' }, { remoteUrl: 'https://x.com/face.jpg' },
  ] }]
  const imported = [
    { assetId: 'a', publicUrl: 'https://gcs/a.jpg', source: { sourceUrl: 'https://x.com/a.jpg', externalCollectionId: 'c1' } },
    { assetId: 'f', publicUrl: 'https://gcs/face.jpg', source: { sourceUrl: 'https://x.com/face.jpg', externalCollectionId: 'c1' } },
  ]
  const outline = [
    { kind: 'heading', level: 1, text: 'Portfolio' },
    { kind: 'image', ref: 'img-1', src: 'https://x.com/a.jpg', caption: 'SF in fog' },
    { kind: 'quote', text: 'Best ever.', attribution: 'Naga' },
    { kind: 'image', ref: 'img-2', src: 'https://x.com/face.jpg', caption: '' },
  ]
  const siteMap = { pages: [{ kind: 'gallery', title: 'Portfolio', slug: 'portfolio', navOrder: 0, sourceUrl: 'https://x.com/portfolio', textContent: '', collectionId: 'c1', outline }] }
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  const types = pages[0].blocks.map((b) => b.type)
  expect(types).toEqual(['text', 'photo', 'testimonial', 'photo'])
  expect(pages[0].blocks[1]).toMatchObject({ type: 'photo', imageUrl: 'https://gcs/a.jpg', caption: 'SF in fog' })
  expect(pages[0].blocks[2]).toMatchObject({ type: 'testimonial', text: 'Best ever.', name: 'Naga' })
})

it('falls back to the capped gallery for an images-only (gallery) page', () => {
  const { siteMap, collections, imported } = fixture(5)
  siteMap.pages[0].outline = [
    { kind: 'image', ref: 'img-1', src: 'https://x.com/pc10.jpg', caption: '' },
  ]
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  expect(pages[0].blocks[0]).toMatchObject({ type: 'photos', layout: 'masonry' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/composer.test.js -t "replicates a designed"`
Expected: FAIL — designed pages currently go through `composeGalleryBlocks`.

- [ ] **Step 3: Implement** — in `common/import/composer.js`, add imports:

```js
import { mapOutlineToBlocks } from './mapper'
```

Replace the gallery branch in `composeSite` (`if (page.kind === 'gallery') { ... }`) with:

```js
    if (page.kind === 'gallery') {
      if (!assets.length) return // an empty gallery page helps no one
      if (classifyLayout(page.outline) === 'designed') {
        const { blocks: plan, confidence } = mapOutlineToBlocks(page.outline)
        const boundBlocks = bindAssets(plan, page.outline, assets)
        blocks = confidence >= 0.5 && boundBlocks.length ? boundBlocks : composeGalleryBlocks(assets)
      } else {
        blocks = composeGalleryBlocks(assets)
      }
      for (const url of videoUrls) blocks.push({ ...defaultBlock('video'), url })
      description = firstParagraphDescription(page.textContent)
    } else if (page.kind === 'about') {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/composer.test.js`
Expected: PASS (all prior composer tests still green — pages without an `outline` classify as `gallery` and behave exactly as before).

- [ ] **Step 5: Commit**

```bash
git add common/import/composer.js __tests__/import/composer.test.js
git commit -m "feat(import): route designed pages through the structural mapper in composeSite"
```

---

### Task 10: Nest imported sub-pages by URL path

`setParentIds(pages)` sets `page.parentId` when another composed page's source path is its immediate URL parent (`/portfolio/landscapes` → child of `/portfolio`). Call it at the end of `composeSite`.

**Files:**
- Modify: `common/import/composer.js` (add `setParentIds`; call before `return { pages }`)
- Test: `__tests__/import/nesting.test.js`

**Interfaces:**
- Consumes: composed pages carrying `source.sourceUrl` and `id`.
- Produces: `setParentIds(pages)` mutates `parentId`; `composeSite` output reflects nesting.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { setParentIds } from '@/common/import/composer'

it('nests a child page under its URL-path parent', () => {
  const pages = [
    { id: 'p_portfolio', parentId: null, source: { sourceUrl: 'https://x.com/portfolio' } },
    { id: 'p_land', parentId: null, source: { sourceUrl: 'https://x.com/portfolio/landscapes' } },
  ]
  setParentIds(pages)
  expect(pages[1].parentId).toBe('p_portfolio')
  expect(pages[0].parentId).toBeNull()
})

it('leaves parentId null when the parent was not imported', () => {
  const pages = [{ id: 'p_land', parentId: null, source: { sourceUrl: 'https://x.com/portfolio/landscapes' } }]
  setParentIds(pages)
  expect(pages[0].parentId).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/nesting.test.js`
Expected: FAIL — `setParentIds is not a function`.

- [ ] **Step 3: Implement** — add to `common/import/composer.js`:

```js
function pathOf(url) {
  try { return new URL(url).pathname.replace(/\/+$/, '') } catch { return '' }
}

// Set parentId from the source URL hierarchy: a page whose path is the immediate
// parent of another page's path becomes its parent. Only wires parents that were
// actually imported; otherwise the child stays top-level.
export function setParentIds(pages) {
  const byPath = new Map()
  for (const p of pages) { const path = pathOf(p.source?.sourceUrl); if (path) byPath.set(path, p.id) }
  for (const p of pages) {
    const path = pathOf(p.source?.sourceUrl)
    if (!path) continue
    const parentPath = path.slice(0, path.lastIndexOf('/'))
    if (parentPath && byPath.has(parentPath) && byPath.get(parentPath) !== p.id) p.parentId = byPath.get(parentPath)
  }
}
```

Call it in `composeSite` just before `return { pages }`:

```js
  setParentIds(pages)
  resolvePageLinks(pages) // added in Task 11
  return { pages }
```

(If Task 11 is not yet implemented when you reach Step 4, temporarily omit the `resolvePageLinks(pages)` line and add it in Task 11.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/nesting.test.js __tests__/import/composer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/composer.js __tests__/import/nesting.test.js
git commit -m "feat(import): nest imported sub-pages under their URL-path parent"
```

---

### Task 11: Resolve link-cards to imported page IDs

`resolvePageLinks(pages)` rewrites each `page-gallery` block's `pageRefs` (source URLs) into `pageIds` pointing at the imported pages, dropping links to pages that weren't imported. A card block left with no targets is dropped.

**Files:**
- Modify: `common/import/composer.js` (add `resolvePageLinks`; ensure it's called in `composeSite` — Task 10)
- Test: `__tests__/import/pageLinks.test.js`

**Interfaces:**
- Consumes: composed pages carrying `source.sourceUrl`, `id`, and `blocks` (with `page-gallery` blocks that carry `pageRefs`).
- Produces: `resolvePageLinks(pages)` mutates `page-gallery` blocks to `{ ...pageIds }`, removes `pageRefs`, drops dead/empty card blocks.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { resolvePageLinks } from '@/common/import/composer'

it('rewrites pageRefs to the imported pages\' ids and drops dead links', () => {
  const pages = [
    { id: 'p_land', source: { sourceUrl: 'https://x.com/portfolio/landscapes' }, blocks: [] },
    { id: 'p_port', source: { sourceUrl: 'https://x.com/portfolio' }, blocks: [
      { type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: ['https://x.com/portfolio/landscapes', 'https://x.com/not-imported'] },
    ] },
  ]
  resolvePageLinks(pages)
  expect(pages[1].blocks[0]).toEqual({ type: 'page-gallery', source: 'manual', pageIds: ['p_land'] })
})

it('drops a page-gallery block whose links all point at non-imported pages', () => {
  const pages = [
    { id: 'p_port', source: { sourceUrl: 'https://x.com/portfolio' }, blocks: [
      { type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: ['https://x.com/gone'] },
    ] },
  ]
  resolvePageLinks(pages)
  expect(pages[0].blocks).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/pageLinks.test.js`
Expected: FAIL — `resolvePageLinks is not a function`.

- [ ] **Step 3: Implement** — add to `common/import/composer.js` (reuse `pathOf` from Task 10):

```js
// Rewrite page-gallery cards from source URLs (pageRefs) to imported page ids.
// Links to pages we didn't import are dropped; a card block with no surviving
// targets is removed (no dead links).
export function resolvePageLinks(pages) {
  const idByPath = new Map()
  for (const p of pages) { const path = pathOf(p.source?.sourceUrl); if (path) idByPath.set(path, p.id) }
  for (const p of pages) {
    p.blocks = (p.blocks || []).filter((b) => {
      if (b.type !== 'page-gallery' || !b.pageRefs) return true
      const pageIds = b.pageRefs.map((u) => idByPath.get(pathOf(u))).filter(Boolean)
      if (!pageIds.length) return false
      delete b.pageRefs
      b.pageIds = pageIds
      return true
    })
  }
}
```

Ensure `composeSite` calls `resolvePageLinks(pages)` after `setParentIds(pages)` (see Task 10 Step 3).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/pageLinks.test.js __tests__/import/composer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/composer.js __tests__/import/pageLinks.test.js
git commit -m "feat(import): resolve link-card blocks to imported page ids"
```

---

### Task 12: Golden end-to-end fixture (swamiphoto/portfolio)

A single integration test that runs a captured, representative outline for the `swamiphoto.com/portfolio` structure through `composeSite` and asserts the whole thing: intro heading, captioned photos, side caption, testimonials, essay, link cards, 2-up, "Recent Work" heading, and landscapes/portraits/bollywood nested under portfolio with cards resolved.

**Files:**
- Create: `__tests__/import/structuralReplication.golden.test.js`

**Interfaces:**
- Consumes: `composeSite` (fully integrated through Tasks 6–11).
- Produces: nothing (assertion-only).

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { composeSite } from '@/common/import/composer'

// Representative of the real /portfolio structure (see the design's golden case).
const A = (n) => ({ assetId: `a${n}`, publicUrl: `https://gcs/a${n}.jpg`, source: { sourceUrl: `https://x.com/a${n}.jpg`, externalCollectionId: 'portfolio' } })
const IMG = (n, caption = '') => ({ kind: 'image', ref: `img-${n}`, src: `https://x.com/a${n}.jpg`, caption })

const portfolioOutline = [
  { kind: 'heading', level: 1, text: 'Portfolio' },
  { kind: 'paragraph', text: 'Welcome to my portfolio.' },
  IMG(1, 'San Francisco in fog'),
  IMG(2, 'Recreating a Mac wallpaper'),
  { kind: 'quote', text: 'Working with Swami is a joy.', attribution: 'Naga Madhavapeddi' },
  IMG(3), { kind: 'paragraph', text: 'Aurora Borealis in California — a rare shot.' }, // side caption
  { kind: 'linkcards', items: [
    { href: 'https://x.com/portfolio/landscapes', label: 'Landscapes & Cities' },
    { href: 'https://x.com/portfolio/portraits', label: 'Portraits' },
    { href: 'https://x.com/portfolio/bollywood', label: 'Bollywood' },
  ] },
  { kind: 'quote', text: 'Top notch.', attribution: 'Vivek Gupta' },
  { kind: 'heading', level: 2, text: 'Recent Work' },
]

function buildArgs() {
  const outlineImgs = portfolioOutline.filter((n) => n.kind === 'image')
  const collections = [
    { id: 'portfolio', name: 'Portfolio', assetRefs: outlineImgs.map((n) => ({ remoteUrl: n.src })) },
    { id: 'landscapes', name: 'Landscapes', assetRefs: [{ remoteUrl: 'https://x.com/l1.jpg' }] },
  ]
  const imported = [
    ...outlineImgs.map((n) => A(n.ref.split('-')[1])),
    { assetId: 'l1', publicUrl: 'https://gcs/l1.jpg', source: { sourceUrl: 'https://x.com/l1.jpg', externalCollectionId: 'landscapes' } },
  ]
  const siteMap = { pages: [
    { kind: 'gallery', title: 'Portfolio', slug: 'portfolio', navOrder: 0, sourceUrl: 'https://x.com/portfolio', textContent: '', collectionId: 'portfolio', outline: portfolioOutline },
    { kind: 'gallery', title: 'Landscapes', slug: 'landscapes', navOrder: 1, sourceUrl: 'https://x.com/portfolio/landscapes', textContent: '', collectionId: 'landscapes', outline: [{ kind: 'image', ref: 'img-1', src: 'https://x.com/l1.jpg', caption: '' }] },
  ] }
  return { siteMap, collections, imported, importBatchId: 'imp_g', existingPages: [] }
}

describe('golden: swamiphoto/portfolio structural replication', () => {
  const { pages } = composeSite(buildArgs())
  const portfolio = pages.find((p) => p.slug === 'portfolio')
  const landscapes = pages.find((p) => p.slug === 'landscapes')

  it('replicates the portfolio block sequence', () => {
    const types = portfolio.blocks.map((b) => b.type)
    expect(types).toEqual(['text', 'text', 'photo', 'photo', 'testimonial', 'photo', 'page-gallery', 'testimonial', 'text'])
  })
  it('keeps the side caption as a side-by-side photo', () => {
    const side = portfolio.blocks[5]
    expect(side).toMatchObject({ type: 'photo', variant: 3, caption: 'Aurora Borealis in California — a rare shot.' })
  })
  it('resolves the link cards to the imported landscapes page id', () => {
    const cards = portfolio.blocks.find((b) => b.type === 'page-gallery')
    expect(cards.pageIds).toContain(landscapes.id)
    expect(cards.pageRefs).toBeUndefined()
  })
  it('nests landscapes under portfolio', () => {
    expect(landscapes.parentId).toBe(portfolio.id)
  })
  it('renders the flat landscapes sub-page as a gallery (single-image masonry)', () => {
    expect(landscapes.blocks[0]).toMatchObject({ type: 'photos', layout: 'masonry' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `npx jest __tests__/import/structuralReplication.golden.test.js`
Expected: If Tasks 1–11 are complete, this should PASS on first run. If it fails, the failure pinpoints the integration gap — fix in the relevant module, not here.

- [ ] **Step 3: (No new implementation)** — this task validates the integrated pipeline. If red, fix the implicated module and re-run.

- [ ] **Step 4: Full import suite green**

Run: `npx jest __tests__/import/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/import/structuralReplication.golden.test.js
git commit -m "test(import): golden end-to-end structural replication (portfolio + nesting + cards)"
```

---

### Task 13: Narrated reveal interstitial

Add a branded reveal shown when the user clicks "Build my pages for me": animated mockshots of the real block types with an honest phase caption, then it hands off to `onComplete({ replicate: true })`. For v1 the client compose is near-instant, so the reveal is a short choreographed welcome (not a fake long progress bar); it becomes real-progress-driven in the AI follow-up plan.

**Files:**
- Create: `components/admin/import/ImportRebuildProgress.js`
- Modify: `components/admin/import/ImportFlow.js:173-192` (route "Build my pages for me" through the reveal step)
- Test: `__tests__/components/ImportRebuildProgress.test.js`

**Interfaces:**
- Consumes: `summary` (has `imported[]` for thumbnails), `onDone` callback.
- Produces: `<ImportRebuildProgress summary onDone />` — cycles phase captions and calls `onDone()` once after the sequence.

- [ ] **Step 1: Write the failing test**

```js
import { render, screen, act } from '@testing-library/react'
import ImportRebuildProgress from '@/components/admin/import/ImportRebuildProgress'

jest.useFakeTimers()

it('shows a phase caption and calls onDone after the reveal sequence', () => {
  const onDone = jest.fn()
  render(<ImportRebuildProgress summary={{ imported: [{ publicUrl: 'https://gcs/a.jpg' }] }} onDone={onDone} />)
  expect(screen.getByText(/Reading your pages|Mapping your layout|Placing your blocks/i)).toBeInTheDocument()
  expect(onDone).not.toHaveBeenCalled()
  act(() => { jest.advanceTimersByTime(4000) })
  expect(onDone).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ImportRebuildProgress.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `components/admin/import/ImportRebuildProgress.js`

```js
import { useEffect, useState } from 'react'
import { monoLabel } from './importFlowStyles'

const PHASES = ['Reading your pages…', 'Mapping your layout…', 'Placing your blocks…']
const SHOWCASE_BG = 'radial-gradient(120% 90% at 50% 8%, #efe8dc 0%, #e4dccf 45%, #d8cdba 100%)'

// A short branded welcome while the (near-instant) client-side rebuild runs. Not
// a progress bar pretending to do minutes of work — a choreographed reveal of the
// block types the rebuild is placing, then hand off. The AI follow-up plan swaps
// the timed cadence for real per-page progress events.
export default function ImportRebuildProgress({ summary, onDone }) {
  const [phase, setPhase] = useState(0)
  const thumbs = (summary?.imported || []).slice(0, 6).map((a) => a.publicUrl).filter(Boolean)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200)
    const t2 = setTimeout(() => setPhase(2), 2400)
    const done = setTimeout(() => onDone && onDone(), 3600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(done) }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: SHOWCASE_BG }}>
      <div className="flex gap-3" style={{ marginBottom: 26 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 92, height: 68, borderRadius: 4, background: '#fff', boxShadow: '0 8px 22px rgba(60,40,15,0.18)', overflow: 'hidden', transform: `rotate(${i - 1}deg)` }}>
            {thumbs[i] && <img src={thumbs[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
        ))}
      </div>
      <p style={{ ...monoLabel }}>{PHASES[phase]}</p>
      <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Building your site — sit tight, this takes a few seconds.</p>
    </div>
  )
}
```

Wire it into `components/admin/import/ImportFlow.js`. Add a `'rebuilding'` step: when `ImportDoneStep` fires `onEnter({ replicate: true })`, show the reveal, then call `onComplete`. Replace the `onEnter` handler in the `step === 'done'` block:

```js
          <ImportDoneStep
            summary={summary}
            onEnter={(opts) => {
              if (opts?.replicate) { setStep('rebuilding'); return }
              return onComplete({ ...summary, replicate: false })
            }}
            onImportAnother={() => { /* unchanged */ }}
          />
```

And add, above the `step === 'done'` block:

```js
  if (step === 'rebuilding' && summary) {
    return <ImportRebuildProgress summary={summary} onDone={() => onComplete({ ...summary, replicate: true })} />
  }
```

Add the import at the top of `ImportFlow.js`:

```js
import ImportRebuildProgress from './ImportRebuildProgress'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ImportRebuildProgress.test.js __tests__/components/ImportDoneStep.test.js`
Expected: PASS (existing `ImportDoneStep`/`LibraryImportWiring` tests still green — `onEnter` still receives `{ replicate }` and the consumer path is unchanged; the reveal only defers the `onComplete({replicate:true})` call).

- [ ] **Step 5: Commit**

```bash
git add components/admin/import/ImportRebuildProgress.js components/admin/import/ImportFlow.js __tests__/components/ImportRebuildProgress.test.js
git commit -m "feat(import): narrated reveal interstitial for the rebuild step"
```

---

## Self-Review

**Spec coverage:**
- Ordered outline extraction → Task 2, threaded in Task 3. ✓
- Designed-vs-gallery decision → Task 6, integrated Task 9. ✓
- Structural mapper (rules default, keyless) behind `mapOutlineToBlocks` → Tasks 5 (+ mapper.js seam). ✓
- Block-schema contract + validation → Task 4. ✓
- Asset binding (identity match, captions) → Task 7. ✓
- Capped fallback → Task 8. ✓
- Nesting via URL path → Task 10. ✓
- Link-card resolution (drop dead) → Task 11. ✓
- Side-caption theme-independent encoding → Task 1. ✓
- Reveal screen → Task 13. ✓
- Golden case (swamiphoto/portfolio) → Task 12. ✓
- AI mapper (`aiMapper`), server route, streaming real-progress reveal → **explicitly out of scope for this plan** (see Follow-up). The `mapper.js` seam (Task 5) is where it plugs in.

**Type consistency:** `mapOutlineToBlocks` returns `{ blocks, confidence }` in Tasks 5, 9. `bindAssets(blocks, outline, pageAssets)` used consistently in Tasks 7, 9. `setParentIds`/`resolvePageLinks` mutate in place and are both called in `composeSite` (Tasks 10, 11). Emitted image blocks carry `ref`/`refs`; bound blocks carry `imageUrl`/`images`/`imageUrls` — the two never mix (validated in Task 7). Photo `variant: 3` is the single side-caption encoding (Tasks 1, 5, 7, 12).

**Placeholder scan:** none — every step has real test and implementation code.

## Follow-up (separate future plan — not built here)

**AI mapper + real-progress reveal.** Add `aiMapper` (Sonnet 5, `IMPORT_MAPPER_MODEL`, structured outputs) behind the `mapper.js` seam; a server route `pages/api/admin/import/compose.js` that runs the async mapper and streams per-page progress; `IMPORT_MAPPER=rules|ai` selection by key presence; and the real-progress version of the reveal. **Prerequisite:** `ANTHROPIC_API_KEY` with credits (the key is stored and authenticates; the account currently has no balance).
