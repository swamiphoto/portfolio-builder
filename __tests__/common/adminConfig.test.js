import {
  LIBRARY_CONFIG_VERSION,
  createAssetIdFromUrl,
  createEmptyLibraryConfig,
  mergeLibraryData,
  normalizeLibraryConfig,
  getRollupUrls,
  getRollupCount,
} from '../../common/adminConfig'

describe('createEmptyLibraryConfig', () => {
  it('returns the versioned library schema', () => {
    expect(createEmptyLibraryConfig()).toEqual({
      version: LIBRARY_CONFIG_VERSION,
      assets: {},
      assetOrder: [],
      sets: {},
      savedViews: {},
      portfolios: {},
      galleries: {},
    })
  })
})

describe('normalizeLibraryConfig', () => {
  it('migrates legacy portfolios and galleries into canonical assets', () => {
    const imageA = 'https://example.com/photos/a.jpg'
    const imageB = 'https://example.com/photos/b.jpg'

    const config = normalizeLibraryConfig(
      {
        portfolios: {
          landscapes: [imageA, imageA],
        },
        galleries: {
          arizona: [imageA, imageB],
        },
      },
      [
        { url: imageA, name: 'a.jpg', timeCreated: '2026-01-01T00:00:00Z', updated: '2026-01-02T00:00:00Z', size: 100 },
        { url: imageB, name: 'b.jpg', timeCreated: '2026-01-03T00:00:00Z', updated: '2026-01-04T00:00:00Z', size: 200 },
      ]
    )

    const assetAId = createAssetIdFromUrl(imageA)
    const assetBId = createAssetIdFromUrl(imageB)

    expect(config.version).toBe(LIBRARY_CONFIG_VERSION)
    expect(config.portfolios.landscapes).toEqual([imageA])
    expect(config.galleries.arizona).toEqual([imageA, imageB])
    expect(config.assetOrder).toEqual([assetAId, assetBId])

    expect(config.assets[assetAId]).toMatchObject({
      assetId: assetAId,
      publicUrl: imageA,
      originalFilename: 'a.jpg',
      bytes: 100,
      usage: {
        cover: false,
        pageIds: ['landscapes'],
        galleryIds: ['arizona'],
        blockIds: [],
        usageCount: 2,
        lastUsedAt: null,
      },
    })

    expect(config.assets[assetBId]).toMatchObject({
      assetId: assetBId,
      publicUrl: imageB,
      originalFilename: 'b.jpg',
      bytes: 200,
      usage: {
        cover: false,
        pageIds: [],
        galleryIds: ['arizona'],
        blockIds: [],
        usageCount: 1,
        lastUsedAt: null,
      },
    })
  })

  it('preserves existing asset metadata while refreshing file-backed fields', () => {
    const imageUrl = 'https://example.com/photos/lightroom-edit.jpg'

    const config = normalizeLibraryConfig(
      {
        assets: {
          ast_custom: {
            assetId: 'ast_custom',
            publicUrl: imageUrl,
            caption: 'Sunrise over Yosemite',
            source: {
              provider: 'lightroom',
              externalAssetId: 'lr-123',
              syncMode: 'publish',
            },
          },
        },
      },
      [
        { url: imageUrl, name: 'lightroom-edit.jpg', size: 512, width: 4000, height: 3000 },
      ]
    )

    expect(config.assets.ast_custom).toMatchObject({
      assetId: 'ast_custom',
      publicUrl: imageUrl,
      caption: 'Sunrise over Yosemite',
      bytes: 512,
      width: 4000,
      height: 3000,
      aspectRatio: 1.3333,
      orientation: 'landscape',
      source: {
        provider: 'lightroom',
        externalAssetId: 'lr-123',
        syncMode: 'publish',
      },
    })
  })
})

describe('mergeLibraryData', () => {
  it('returns both asset-backed data and the legacy URL contract', () => {
    const imageUrl = 'https://example.com/photos/a.jpg'
    const merged = mergeLibraryData(
      [
        { url: imageUrl, name: 'a.jpg', size: 128 },
      ],
      {
        portfolios: { landscapes: [imageUrl] },
      }
    )

    const assetId = createAssetIdFromUrl(imageUrl)

    expect(merged.version).toBe(LIBRARY_CONFIG_VERSION)
    expect(merged.allImages).toEqual([imageUrl])
    expect(merged.assetOrder).toEqual([assetId])
    expect(merged.images).toHaveLength(1)
    expect(merged.assets[assetId].publicUrl).toBe(imageUrl)
    expect(merged.assetIdByUrl[imageUrl]).toBe(assetId)
    expect(merged.metadata[imageUrl]).toMatchObject({
      assetId,
      name: 'a.jpg',
      size: 128,
      usageCount: 1,
    })
    expect(merged.counts).toEqual({
      all: 1,
      landscapes: 1,
    })
  })
})

describe('getRollupUrls', () => {
  const galleries = {
    'portraits': ['url-a', 'url-b'],
    'portraits/mala': ['url-a', 'url-c'],
    'portraits/john': ['url-d'],
    'landscapes': ['url-e'],
  }

  it('returns own urls + all descendant urls, deduped', () => {
    const result = getRollupUrls('portraits', galleries)
    expect(result).toHaveLength(4)
    expect(new Set(result)).toEqual(new Set(['url-a', 'url-b', 'url-c', 'url-d']))
  })

  it('returns only own urls for a leaf with no children', () => {
    const result = getRollupUrls('portraits/mala', galleries)
    expect(result).toEqual(['url-a', 'url-c'])
  })

  it('does not include sibling collections', () => {
    const result = getRollupUrls('portraits/mala', galleries)
    expect(result).not.toContain('url-d')
  })

  it('returns empty array for unknown key', () => {
    expect(getRollupUrls('unknown', galleries)).toEqual([])
  })
})

describe('getRollupCount', () => {
  const galleries = {
    'portraits': ['url-a'],
    'portraits/mala': ['url-a', 'url-c'],
    'portraits/john': ['url-d'],
  }

  it('returns deduped count across own + descendants', () => {
    expect(getRollupCount('portraits', galleries)).toBe(3)
  })

  it('returns own count for leaf', () => {
    expect(getRollupCount('portraits/mala', galleries)).toBe(2)
  })
})

describe('mergeLibraryData rollup counts', () => {
  it('uses rollup count for parent collections', () => {
    const urlA = 'https://example.com/a.jpg'
    const urlB = 'https://example.com/b.jpg'
    const merged = mergeLibraryData(
      [{ url: urlA, name: 'a.jpg', size: 1 }, { url: urlB, name: 'b.jpg', size: 1 }],
      {
        galleries: {
          'portraits': [urlA],
          'portraits/mala': [urlA, urlB],
        },
      }
    )
    expect(merged.counts['portraits']).toBe(2)
    expect(merged.counts['portraits/mala']).toBe(2)
  })
})

describe('normalizeLibraryConfig — sets back-compat', () => {
  it('reads legacy `collections` key and exposes it as `sets`', () => {
    const legacy = {
      assets: {},
      collections: {
        wed24: { collectionId: 'wed24', name: 'Weddings 2024', kind: 'manual', assetIds: ['ast_a'] },
      },
    }
    const out = normalizeLibraryConfig(legacy)
    expect(out.sets).toBeDefined()
    expect(out.sets.wed24).toMatchObject({ setId: 'wed24', name: 'Weddings 2024', assetIds: ['ast_a'] })
    expect(out.collections).toBeUndefined()
  })

  it('reads modern `sets` key as-is', () => {
    const modern = {
      assets: {},
      sets: {
        wed24: { setId: 'wed24', name: 'Weddings 2024', kind: 'manual', assetIds: ['ast_a'] },
      },
    }
    const out = normalizeLibraryConfig(modern)
    expect(out.sets.wed24.setId).toBe('wed24')
  })

  it('migrates asset.collectionIds → asset.setIds', () => {
    const legacy = {
      assets: {
        ast_a: { url: 'https://x/a.jpg', collectionIds: ['wed24'] },
      },
    }
    const out = normalizeLibraryConfig(legacy)
    expect(out.assets.ast_a.setIds).toEqual(['wed24'])
    expect(out.assets.ast_a.collectionIds).toBeUndefined()
  })

  it('prefers modern `sets` over legacy `collections` on key collision', () => {
    const both = {
      assets: {},
      collections: { wed24: { name: 'Old Name', assetIds: ['ast_x'] } },
      sets: { wed24: { name: 'New Name', assetIds: ['ast_y'] } },
    }
    const out = normalizeLibraryConfig(both)
    expect(out.sets.wed24.name).toBe('New Name')
    expect(out.sets.wed24.assetIds).toEqual(['ast_y'])
  })

  it('prefers asset.setIds over legacy asset.collectionIds when both present', () => {
    const mixed = {
      assets: {
        ast_a: { url: 'https://x/a.jpg', setIds: ['new'], collectionIds: ['old'] },
      },
    }
    const out = normalizeLibraryConfig(mixed)
    expect(out.assets.ast_a.setIds).toEqual(['new'])
  })
})

describe('normalizeLibraryConfig — forSale reserved', () => {
  it('defaults forSale to false when not present on the input asset', () => {
    const config = normalizeLibraryConfig({
      assets: { ast_1: { assetId: 'ast_1', publicUrl: 'https://x/a.jpg' } },
    })
    expect(config.assets.ast_1.forSale).toBe(false)
  })

  it('preserves forSale=true when set on the input asset', () => {
    const config = normalizeLibraryConfig({
      assets: { ast_1: { assetId: 'ast_1', publicUrl: 'https://x/a.jpg', forSale: true } },
    })
    expect(config.assets.ast_1.forSale).toBe(true)
  })
})

describe('asset.print defaults', () => {
  it('adds a print object with safe defaults to a bare asset', () => {
    const config = {
      assets: {
        a1: { assetId: 'a1', publicUrl: 'https://x/a.jpg', width: 6000, height: 4000 },
      },
      assetOrder: ['a1'],
    }
    const out = normalizeLibraryConfig(config, [])
    const print = out.assets.a1.print
    expect(print).toEqual({
      sellable: false,
      masterStorageKey: null,
      masterWidth: null,
      masterHeight: null,
      minDpi: 240,
      availableSizes: [],
      maxSharpSize: null,
      focalPoint: null,
    })
    expect(out.assets.a1.forSale).toBe(false)
  })

  it('preserves an existing sellable print object and mirrors forSale', () => {
    const config = {
      assets: {
        a1: {
          assetId: 'a1', publicUrl: 'https://x/a.jpg', width: 6000, height: 4000,
          print: { sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10', minDpi: 240 },
        },
      },
      assetOrder: ['a1'],
    }
    const out = normalizeLibraryConfig(config, [])
    expect(out.assets.a1.print.sellable).toBe(true)
    expect(out.assets.a1.print.availableSizes).toEqual(['8x10'])
    expect(out.assets.a1.forSale).toBe(true)
  })
})
