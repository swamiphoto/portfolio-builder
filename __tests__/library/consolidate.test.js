// __tests__/library/consolidate.test.js
import { consolidate } from '@/common/library/consolidate'

const libraryConfig = {
  assets: {
    keep: { assetId: 'keep', publicUrl: 'https://cdn/keep.jpg', setIds: ['s1'], tags: ['x'], caption: '', usage: { pageIds: ['home'], galleryIds: ['japan'], blockIds: ['b1'], cover: false } },
    dup:  { assetId: 'dup',  publicUrl: 'https://cdn/dup.jpg',  setIds: ['s2'], tags: ['y'], caption: 'nice', usage: { pageIds: ['about'], galleryIds: ['best'], blockIds: ['b2'], cover: true } },
    other:{ assetId: 'other',publicUrl: 'https://cdn/other.jpg' },
  },
  assetOrder: ['keep', 'dup', 'other'],
  assetIdByUrl: { 'https://cdn/keep.jpg': 'keep', 'https://cdn/dup.jpg': 'dup', 'https://cdn/other.jpg': 'other' },
  galleries: { japan: ['https://cdn/keep.jpg'], best: ['https://cdn/dup.jpg', 'https://cdn/other.jpg'] },
  portfolios: {},
  sets: { s1: { setId: 's1', assetIds: ['keep'] }, s2: { setId: 's2', assetIds: ['dup'] } },
}
const siteConfig = {
  pages: [
    { id: 'home', blocks: [{ id: 'b1', type: 'photo', image: { assetId: 'keep', url: 'https://cdn/keep.jpg' }, imageUrl: 'https://cdn/keep.jpg' }] },
    { id: 'about', blocks: [
      { id: 'b2', type: 'photo', image: { assetId: 'dup', url: 'https://cdn/dup.jpg' }, imageUrl: 'https://cdn/dup.jpg' },
      { id: 'b3', type: 'masonry', images: [{ assetId: 'dup', url: 'https://cdn/dup.jpg' }, { assetId: 'other', url: 'https://cdn/other.jpg' }], imageUrls: ['https://cdn/dup.jpg', 'https://cdn/other.jpg'] },
    ] },
  ],
}

describe('consolidate', () => {
  const out = consolidate(libraryConfig, siteConfig, [{ canonicalId: 'keep', redundantIds: ['dup'] }])

  it('reports the redundant file to delete', () => {
    expect(out.deleteUrls).toEqual(['https://cdn/dup.jpg'])
    expect(out.siteChanged).toBe(true)
  })
  it('drops the redundant asset record + index entries', () => {
    expect(out.libraryConfig.assets.dup).toBeUndefined()
    expect(out.libraryConfig.assetOrder).toEqual(['keep', 'other'])
    expect(out.libraryConfig.assetIdByUrl['https://cdn/dup.jpg']).toBeUndefined()
  })
  it('rewrites gallery URLs to the canonical and de-dupes', () => {
    expect(out.libraryConfig.galleries.best).toEqual(['https://cdn/keep.jpg', 'https://cdn/other.jpg'])
  })
  it('rewrites set assetIds to the canonical and unions setIds', () => {
    expect(out.libraryConfig.sets.s2.assetIds).toEqual(['keep'])
    expect(out.libraryConfig.assets.keep.setIds.sort()).toEqual(['s1', 's2'])
  })
  it('unions tags + usage and adopts the non-empty caption', () => {
    expect(out.libraryConfig.assets.keep.tags.sort()).toEqual(['x', 'y'])
    expect(out.libraryConfig.assets.keep.caption).toBe('nice')
    expect(out.libraryConfig.assets.keep.usage.pageIds.sort()).toEqual(['about', 'home'])
    expect(out.libraryConfig.assets.keep.usage.cover).toBe(true)
  })
  it('rewrites page/block references (single + multi, url + assetId + legacy)', () => {
    const about = out.siteConfig.pages.find((p) => p.id === 'about')
    expect(about.blocks[0].image).toEqual({ assetId: 'keep', url: 'https://cdn/keep.jpg' })
    expect(about.blocks[0].imageUrl).toBe('https://cdn/keep.jpg')
    expect(about.blocks[1].images).toEqual([{ assetId: 'keep', url: 'https://cdn/keep.jpg' }, { assetId: 'other', url: 'https://cdn/other.jpg' }])
    expect(about.blocks[1].imageUrls).toEqual(['https://cdn/keep.jpg', 'https://cdn/other.jpg'])
  })
  it('does not mutate the inputs', () => {
    expect(libraryConfig.assets.dup).toBeDefined()
  })
})
