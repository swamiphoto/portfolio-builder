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
