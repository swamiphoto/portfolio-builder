import {
  buildMultiImageFields,
  buildSingleImageFields,
  getImageRefUrl,
  getPagesInSet,
  mergeImageRefs,
  normalizeGalleryEntity,
  normalizeImageRef,
  normalizePageEntity,
  removeImageRef,
} from '../../common/assetRefs'

describe('normalizeImageRef', () => {
  it('converts string URLs into image refs', () => {
    expect(normalizeImageRef('https://example.com/a.jpg')).toEqual({
      assetId: null,
      url: 'https://example.com/a.jpg',
    })
  })

  it('normalizes asset objects with publicUrl', () => {
    expect(normalizeImageRef({ assetId: 'ast_1', publicUrl: 'https://example.com/a.jpg' })).toEqual({
      assetId: 'ast_1',
      url: 'https://example.com/a.jpg',
    })
  })
})

describe('image ref helpers', () => {
  it('builds mirrored single-image fields', () => {
    expect(buildSingleImageFields({ assetId: 'ast_1', url: 'https://example.com/a.jpg' })).toEqual({
      image: { assetId: 'ast_1', url: 'https://example.com/a.jpg' },
      imageUrl: 'https://example.com/a.jpg',
    })
  })

  it('merges and removes image refs by asset id when available', () => {
    const merged = mergeImageRefs(
      [{ assetId: 'ast_1', url: 'https://example.com/a.jpg' }],
      [
        { assetId: 'ast_1', url: 'https://example.com/a-redundant.jpg' },
        { assetId: 'ast_2', url: 'https://example.com/b.jpg' },
      ]
    )

    expect(merged).toEqual([
      { assetId: 'ast_1', url: 'https://example.com/a.jpg' },
      { assetId: 'ast_2', url: 'https://example.com/b.jpg' },
    ])

    expect(removeImageRef(merged, { assetId: 'ast_1', url: 'https://example.com/a.jpg' })).toEqual([
      { assetId: 'ast_2', url: 'https://example.com/b.jpg' },
    ])
  })

  it('builds mirrored multi-image fields', () => {
    expect(buildMultiImageFields([
      { assetId: 'ast_1', url: 'https://example.com/a.jpg' },
      'https://example.com/b.jpg',
    ])).toEqual({
      images: [
        { assetId: 'ast_1', url: 'https://example.com/a.jpg' },
        { assetId: null, url: 'https://example.com/b.jpg' },
      ],
      imageUrls: [
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ],
    })
  })
})

describe('normalize entity helpers', () => {
  it('normalizes gallery thumbnails, cover images, and blocks', () => {
    const gallery = normalizeGalleryEntity({
      thumbnailUrl: 'https://example.com/thumb.jpg',
      slideshowSettings: { coverImageUrl: 'https://example.com/cover.jpg' },
      blocks: [
        { type: 'photo', imageUrl: 'https://example.com/photo.jpg' },
        { type: 'photos', imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] },
      ],
    })

    expect(getImageRefUrl(gallery.thumbnail)).toBe('https://example.com/thumb.jpg')
    expect(getImageRefUrl(gallery.slideshowSettings.coverImage)).toBe('https://example.com/cover.jpg')
    expect(gallery.blocks[0].image).toEqual({
      assetId: null,
      url: 'https://example.com/photo.jpg',
    })
    expect(gallery.blocks[1].images).toHaveLength(2)
  })

  it('normalizes page thumbnails and block refs', () => {
    const page = normalizePageEntity({
      thumbnailUrl: 'https://example.com/thumb.jpg',
      blocks: [{ type: 'photo', imageUrl: 'https://example.com/photo.jpg' }],
    })

    expect(getImageRefUrl(page.thumbnail)).toBe('https://example.com/thumb.jpg')
    expect(page.blocks[0].imageUrl).toBe('https://example.com/photo.jpg')
    expect(page.blocks[0].image).toEqual({
      assetId: null,
      url: 'https://example.com/photo.jpg',
    })
  })
})

describe('getPagesInSet', () => {
  const pages = [
    { id: 'p1', blocks: [{ type: 'photo', imageUrl: 'https://x/a.jpg' }] },
    { id: 'p2', blocks: [{ type: 'photos', imageUrls: ['https://x/b.jpg', 'https://x/c.jpg'] }] },
    { id: 'p3', blocks: [{ type: 'text', content: 'hello' }] },
  ]

  it('returns pages that contain an asset in the set', () => {
    const setsByUrl = {
      'https://x/a.jpg': ['s1'],
      'https://x/b.jpg': ['s2'],
    }
    expect(getPagesInSet('s1', pages, setsByUrl).map(p => p.id)).toEqual(['p1'])
    expect(getPagesInSet('s2', pages, setsByUrl).map(p => p.id)).toEqual(['p2'])
  })

  it('returns empty array when nothing matches', () => {
    expect(getPagesInSet('nope', pages, {})).toEqual([])
  })

  it('handles missing inputs gracefully', () => {
    expect(getPagesInSet(null, pages, {})).toEqual([])
    expect(getPagesInSet('s1', null, {})).toEqual([])
    expect(getPagesInSet('s1', pages, null)).toEqual([])
  })
})
