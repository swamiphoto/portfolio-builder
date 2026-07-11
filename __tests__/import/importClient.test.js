// __tests__/import/importClient.test.js
import { chunk, slugify, discoverSource, importSelected, applyImportToConfig, ImportError } from '@/common/import/importClient'

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

function jsonRes(ok, status, body) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) })
}

describe('chunk / slugify', () => {
  it('chunks into fixed sizes', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  it('slugifies a collection name', () => {
    expect(slugify('Big Sur 2024!')).toBe('big-sur-2024')
  })
})

describe('discoverSource', () => {
  it('returns the discovery payload on 200', async () => {
    global.fetch.mockReturnValue(jsonRes(true, 200, { provider: 'generic', site: { title: 'X' }, collections: [], totalAssets: 5 }))
    const out = await discoverSource('joe.com')
    expect(out.totalAssets).toBe(5)
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/import/discover', expect.objectContaining({ method: 'POST' }))
  })
  it('throws ImportError with the friendly message on failure', async () => {
    global.fetch.mockReturnValue(jsonRes(false, 502, { error: 'discovery_failed', message: "We couldn't read that link." }))
    await expect(discoverSource('bad')).rejects.toMatchObject({ name: 'ImportError', status: 502, message: "We couldn't read that link." })
  })
})

describe('importSelected', () => {
  it('batches refs, accumulates results, and reports progress', async () => {
    global.fetch
      .mockReturnValueOnce(jsonRes(true, 200, { imported: [{ assetId: 'a1' }, { assetId: 'a2' }], failed: [], skipped: [] }))
      .mockReturnValueOnce(jsonRes(true, 200, { imported: [{ assetId: 'a3' }], failed: [{ remoteUrl: 'x', reason: 'boom' }], skipped: [] }))
    const progress = []
    const out = await importSelected({
      provider: 'generic', label: 'joe.com', importBatchId: 'imp_x', batchSize: 2,
      selectedCollections: [{ id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'u1' }, { remoteUrl: 'u2' }, { remoteUrl: 'u3' }] }],
      onProgress: (p) => progress.push(p),
    })
    expect(out.imported).toHaveLength(3)
    expect(out.failed).toHaveLength(1)
    expect(out.total).toBe(3)
    expect(progress[progress.length - 1]).toEqual({ done: 3, total: 3, importedCount: 3, failedCount: 1 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('applyImportToConfig', () => {
  it('merges assets and builds one gallery per collection by externalCollectionId', () => {
    const config = { portfolios: {}, galleries: { existing: ['keep'] }, assets: {} }
    const imported = [
      { assetId: 'a1', publicUrl: 'https://cdn/1.jpg', source: { externalCollectionId: 'c1' } },
      { assetId: 'a2', publicUrl: 'https://cdn/2.jpg', source: { externalCollectionId: 'c1' } },
    ]
    const collections = [{ id: 'c1', name: 'Big Sur' }]
    const next = applyImportToConfig(config, { imported, collections })
    expect(Object.keys(next.assets)).toEqual(['a1', 'a2'])
    expect(next.galleries['big-sur']).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg'])
    expect(next.galleries.existing).toEqual(['keep'])
  })
})
