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
  it('groups imported assets into library sets, not galleries', () => {
    const config = { assets: {}, sets: {}, savedViews: [{ id: 'v1' }], galleries: { keep: ['x'] } }
    const imported = [
      { assetId: 'a1', publicUrl: 'https://gcs/1.jpg', source: { externalCollectionId: 'c1' } },
      { assetId: 'a2', publicUrl: 'https://gcs/2.jpg', source: { externalCollectionId: 'c1' } },
    ]
    const collections = [{ id: 'c1', name: 'Portraits' }]
    const next = applyImportToConfig(config, { imported, collections, importBatchId: 'imp_1', now: '2026-08-16T00:00:00.000Z' })
    const sets = Object.values(next.sets)
    expect(sets).toHaveLength(1)
    expect(sets[0]).toMatchObject({ name: 'Portraits', kind: 'manual', assetIds: ['a1', 'a2'] })
    expect(next.assets.a1.setIds).toEqual([sets[0].setId])
    expect(next.galleries).toEqual({ keep: ['x'] })      // untouched
    expect(next.savedViews).toEqual([{ id: 'v1' }])      // preserved, not dropped
  })

  it('merges into an existing set with the same name', () => {
    const config = { assets: {}, sets: { s1: { setId: 's1', name: 'Portraits', kind: 'manual', assetIds: ['a0'] } } }
    const imported = [{ assetId: 'a1', publicUrl: 'u', source: { externalCollectionId: 'c1' } }]
    const next = applyImportToConfig(config, { imported, collections: [{ id: 'c1', name: 'Portraits' }], importBatchId: 'imp_1', now: 'T' })
    expect(next.sets.s1.assetIds).toEqual(['a0', 'a1'])
    expect(next.assets.a1.setIds).toEqual(['s1'])
  })

  it('does not mutate the caller-provided config or its set objects', () => {
    const originalSet = { setId: 's1', name: 'Portraits', kind: 'manual', assetIds: ['a0'] }
    const config = { assets: {}, sets: { s1: originalSet } }
    const imported = [{ assetId: 'a1', publicUrl: 'u', source: { externalCollectionId: 'c1' } }]
    applyImportToConfig(config, { imported, collections: [{ id: 'c1', name: 'Portraits' }], importBatchId: 'imp_1', now: 'T' })
    expect(config.sets.s1).toBe(originalSet)
    expect(originalSet.assetIds).toEqual(['a0'])
  })
})
