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

describe('buildImportedAsset hash', () => {
  it('writes the content hash to hashes.exact', () => {
    const a = buildImportedAsset({ url: 'https://cdn/x.jpg', width: 2, height: 1, provider: 'generic', hash: 'abc123', now: '2026-07-09T00:00:00Z' })
    expect(a.hashes).toEqual({ exact: 'abc123', perceptual: null })
  })
  it('defaults hashes.exact to null when no hash given', () => {
    const a = buildImportedAsset({ url: 'https://cdn/y.jpg', provider: 'generic', now: '2026-07-09T00:00:00Z' })
    expect(a.hashes).toEqual({ exact: null, perceptual: null })
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
