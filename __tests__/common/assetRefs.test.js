import {
  buildMultiImageFields,
  buildSingleImageFields,
  getImageRefUrl,
  getNestedGalleries,
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

describe('getNestedGalleries', () => {
  const pages = [
    { id: 'travels', kind: 'collection', parentId: null },
    { id: 'italy', kind: 'gallery', parentId: 'travels' },
    { id: 'japan', kind: 'gallery', parentId: 'travels' },
    { id: 'about', kind: 'text', parentId: 'travels' },     // not a gallery — excluded
    { id: 'standalone', kind: 'gallery', parentId: null },  // different parent
  ]

  it('returns gallery pages nested under the given parent', () => {
    expect(getNestedGalleries('travels', pages).map(p => p.id)).toEqual(['italy', 'japan'])
  })

  it('returns empty array when parent has no nested galleries', () => {
    expect(getNestedGalleries('about', pages)).toEqual([])
  })

  it('handles missing inputs gracefully', () => {
    expect(getNestedGalleries(null, pages)).toEqual([])
    expect(getNestedGalleries('travels', null)).toEqual([])
    expect(getNestedGalleries('travels', [])).toEqual([])
  })
})
