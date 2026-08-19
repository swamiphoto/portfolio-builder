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
