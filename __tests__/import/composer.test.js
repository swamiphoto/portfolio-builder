import { composeSite, resolveComposableAssets } from '@/common/import/composer'

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

it('caps every synthesized photos block at 9 images', () => {
  const { siteMap, collections, imported } = fixture(40)
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  for (const b of pages[0].blocks) {
    if (b.type === 'photos') expect(b.imageUrls.length).toBeLessThanOrEqual(9)
  }
})

it('folds an over-cap tail into a fresh block, capping at 9 and placing every asset once', () => {
  // fixture(30): opener(1) + masonry(9) + solo(1) + stacked(6) + masonry(9) + solo(1) = 27
  // placed, leaving rest=3 (< MIN_TAIL) while the last photos block already holds 9,
  // so 9+3 > 9 forces the else branch to push a fresh masonry block of 3.
  const { siteMap, collections, imported } = fixture(30)
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  const blocks = pages[0].blocks
  for (const b of blocks) {
    if (b.type === 'photos') expect(b.imageUrls.length).toBeLessThanOrEqual(9)
  }
  const total = blocks.reduce((n, b) => n + (b.type === 'photo' ? 1 : b.imageUrls.length), 0)
  expect(total).toBe(30) // every asset placed exactly once
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

it('about pages append leftover assets (2+) as a masonry block, then one video block per videoUrl', () => {
  const collections = [{ id: 'about', name: 'About', assetRefs: [
    { remoteUrl: 'https://x.com/portrait.jpg' },
    { remoteUrl: 'https://x.com/extra1.jpg' },
    { remoteUrl: 'https://x.com/extra2.jpg' },
  ] }]
  const imported = [
    asset('portrait.jpg', { w: 800, h: 1200, cid: 'about' }),
    asset('extra1.jpg', { w: 1200, h: 800, cid: 'about' }),
    asset('extra2.jpg', { w: 1200, h: 800, cid: 'about' }),
  ]
  const siteMap = { pages: [
    {
      kind: 'about', title: 'About', slug: 'about', navOrder: 0, sourceUrl: 'https://x.com/about',
      textContent: 'Hi.\n\nI shoot.', collectionId: 'about',
      videoUrls: ['https://vimeo.com/1', 'https://www.youtube.com/watch?v=abc'],
    },
  ] }
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  const blocks = pages[0].blocks
  expect(blocks[0]).toMatchObject({ type: 'text', variant: 1, content: 'About' })
  expect(blocks[1]).toMatchObject({ type: 'photo', imageUrl: 'https://gcs/portrait.jpg' })
  expect(blocks[2]).toMatchObject({ type: 'text', variant: 3, format: 'markdown', content: 'Hi.\n\nI shoot.' })
  expect(blocks[3]).toMatchObject({ type: 'photos', layout: 'masonry' })
  expect(blocks[3].imageUrls).toEqual(['https://gcs/extra1.jpg', 'https://gcs/extra2.jpg'])
  expect(blocks[4]).toMatchObject({ type: 'video', url: 'https://vimeo.com/1', caption: '' })
  expect(blocks[5]).toMatchObject({ type: 'video', url: 'https://www.youtube.com/watch?v=abc', caption: '' })
  expect(blocks).toHaveLength(6)
})

it('about pages append a single leftover asset as one photo block (not masonry)', () => {
  const collections = [{ id: 'about', name: 'About', assetRefs: [
    { remoteUrl: 'https://x.com/portrait.jpg' },
    { remoteUrl: 'https://x.com/extra1.jpg' },
  ] }]
  const imported = [
    asset('portrait.jpg', { w: 800, h: 1200, cid: 'about' }),
    asset('extra1.jpg', { w: 1200, h: 800, cid: 'about' }),
  ]
  const siteMap = { pages: [
    { kind: 'about', title: 'About', slug: 'about', navOrder: 0, sourceUrl: 'https://x.com/about', textContent: 'Hi.', collectionId: 'about', videoUrls: [] },
  ] }
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  const blocks = pages[0].blocks
  expect(blocks[3]).toMatchObject({ type: 'photo', imageUrl: 'https://gcs/extra1.jpg' })
  expect(blocks).toHaveLength(4)
})

it('gallery pages append one video block per videoUrl after the composed photo blocks', () => {
  const { siteMap, collections, imported } = fixture(5)
  siteMap.pages[0].videoUrls = ['https://vimeo.com/42']
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  const blocks = pages[0].blocks
  expect(blocks[0]).toMatchObject({ type: 'photos', layout: 'masonry' })
  expect(blocks[blocks.length - 1]).toMatchObject({ type: 'video', url: 'https://vimeo.com/42' })
  expect(blocks).toHaveLength(2)
})

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

it('backfills a capped gallery when resolvePageLinks empties a designed page\'s only block', () => {
  // Designed page (outline is a single linkcards node) whose links all point at
  // pages that were NOT imported, so resolvePageLinks strips the page-gallery
  // block, leaving blocks: []. The page still has imported assets, so it must
  // not ship with an empty body.
  const { siteMap, collections, imported } = fixture(5)
  siteMap.pages[0].outline = [
    { kind: 'linkcards', items: [{ href: 'https://x.com/nowhere', label: 'Nowhere' }] },
  ]
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  expect(pages).toHaveLength(1)
  expect(pages[0].blocks.length).toBeGreaterThan(0)
  expect(pages[0].blocks[0]).toMatchObject({ type: 'photos', layout: 'masonry' })
})

it('orders galleries first (by navOrder, nulls last), then about, then contact — regardless of source nav order', () => {
  const collections = [
    { id: 'c1', name: 'Portraits', assetRefs: refs(5, 'c1') },
    { id: 'c2', name: 'Landscapes', assetRefs: refs(5, 'c2') },
  ]
  const imported = [
    ...refs(5, 'c1').map((r, i) => asset(`pc1${i}.jpg`, { cid: 'c1' })),
    ...refs(5, 'c2').map((r, i) => asset(`pc2${i}.jpg`, { cid: 'c2' })),
  ]
  const siteMap = { pages: [
    { kind: 'about', title: 'About', slug: 'about', navOrder: 0, sourceUrl: 'https://x.com/about', textContent: '', collectionId: 'about' },
    { kind: 'gallery', title: 'Portraits', slug: 'portraits', navOrder: 1, sourceUrl: 'https://x.com/portraits', textContent: '', collectionId: 'c1' },
    { kind: 'contact', title: 'Contact', slug: 'contact', navOrder: 2, sourceUrl: 'https://x.com/contact', textContent: '', collectionId: 'contact' },
    { kind: 'gallery', title: 'Landscapes', slug: 'landscapes', navOrder: 3, sourceUrl: 'https://x.com/landscapes', textContent: '', collectionId: 'c2' },
  ] }
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  expect(pages.map((p) => p.slug)).toEqual(['portraits', 'landscapes', 'about', 'contact'])
  expect(pages.map((p) => p.sortOrder)).toEqual([0, 1, 2, 3])
})

it('sets a gallery page description from the first paragraph of its textContent', () => {
  const { siteMap, collections, imported } = fixture(5)
  siteMap.pages[0].textContent = 'A short intro to my portrait work.\n\nMore details follow that should not appear.'
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  expect(pages[0].description).toBe('A short intro to my portrait work.')
})

it('collapses internal newlines within the first paragraph to spaces', () => {
  const { siteMap, collections, imported } = fixture(5)
  siteMap.pages[0].textContent = 'Line one\nLine two continues.\n\nSecond paragraph.'
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  expect(pages[0].description).toBe('Line one Line two continues.')
})

it('caps a long first-paragraph description at 300 characters', () => {
  const { siteMap, collections, imported } = fixture(5)
  siteMap.pages[0].textContent = 'x'.repeat(400)
  const { pages } = composeSite({ siteMap, collections, imported, importBatchId: 'imp_1', existingPages: [] })
  expect(pages[0].description).toHaveLength(300)
})

it('leaves description empty when gallery textContent is empty', () => {
  const { pages } = composeSite({ ...fixture(5), importBatchId: 'imp_1', existingPages: [] })
  expect(pages[0].description).toBe('')
})

it('leaves about/contact page descriptions empty regardless of textContent', () => {
  const siteMap = { pages: [
    { kind: 'about', title: 'About', slug: 'about', navOrder: 0, sourceUrl: 'https://x.com/about', textContent: 'Hi.\n\nI shoot.', collectionId: 'about' },
    { kind: 'contact', title: 'Contact', slug: 'contact', navOrder: 1, sourceUrl: 'https://x.com/contact', textContent: '', collectionId: 'contact' },
  ] }
  const { pages } = composeSite({ siteMap, collections: [], imported: [], importBatchId: 'imp_1', existingPages: [] })
  expect(pages.map((p) => p.description)).toEqual(['', ''])
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

describe('resolveComposableAssets', () => {
  const libraryAssets = {
    aLib1: { assetId: 'aLib1', publicUrl: 'https://gcs/lib1.jpg', source: { sourceUrl: 'https://x.com/skip1.jpg' } },
    aLib2: { assetId: 'aLib2', publicUrl: 'https://gcs/lib2.jpg', source: { sourceUrl: 'https://x.com/skip2.jpg' } },
  }

  it('merges freshly imported assets with matched skipped assets resolved from the library', () => {
    const imported = [{ assetId: 'aNew', publicUrl: 'https://gcs/new.jpg', source: { sourceUrl: 'https://x.com/new.jpg' } }]
    const skipped = ['https://x.com/skip1.jpg', 'https://x.com/skip2.jpg']
    const result = resolveComposableAssets({ imported, skipped, libraryAssets })
    expect(result).toEqual([imported[0], libraryAssets.aLib1, libraryAssets.aLib2])
  })

  it('drops skipped urls that have no matching library asset', () => {
    const result = resolveComposableAssets({ imported: [], skipped: ['https://x.com/skip1.jpg', 'https://x.com/nowhere.jpg'], libraryAssets })
    expect(result).toEqual([libraryAssets.aLib1])
  })

  it('does not duplicate an asset that is somehow present in both imported and skipped', () => {
    const imported = [libraryAssets.aLib1]
    const result = resolveComposableAssets({ imported, skipped: ['https://x.com/skip1.jpg'], libraryAssets })
    expect(result).toEqual([libraryAssets.aLib1])
  })

  it('returns an empty array for empty/undefined inputs', () => {
    expect(resolveComposableAssets({})).toEqual([])
    expect(resolveComposableAssets({ imported: undefined, skipped: undefined, libraryAssets: undefined })).toEqual([])
    expect(resolveComposableAssets({ imported: [], skipped: [], libraryAssets: {} })).toEqual([])
  })
})
