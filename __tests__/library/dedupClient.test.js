import { backfillHashes, applyHashes, runConsolidation } from '@/common/library/dedupClient'

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => jest.resetAllMocks())
const json = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('backfillHashes', () => {
  it('hashes only assets missing a hash, in batches, reporting progress', async () => {
    global.fetch
      .mockReturnValueOnce(json({ hashed: [{ assetId: 'c1', hash: 'h1' }], failed: [] }))
      .mockReturnValueOnce(json({ hashed: [{ assetId: 'c2', hash: 'h2' }], failed: [] }))
    const assets = {
      a: { assetId: 'a', publicUrl: 'ua', hashes: { exact: 'X' } },
      c1: { assetId: 'c1', publicUrl: 'u1' },
      c2: { assetId: 'c2', publicUrl: 'u2' },
    }
    const progress = []
    const out = await backfillHashes(assets, { batchSize: 1, onProgress: (p) => progress.push(p) })
    expect(out.hashes).toEqual({ c1: 'h1', c2: 'h2' })
    expect(progress[progress.length - 1]).toEqual({ done: 2, total: 2 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
describe('applyHashes', () => {
  it('writes hashes.exact into the matching asset records', () => {
    const cfg = { assets: { c1: { assetId: 'c1', hashes: { exact: null, perceptual: null } } } }
    const next = applyHashes(cfg, { c1: 'h1' })
    expect(next.assets.c1.hashes.exact).toBe('h1')
    expect(cfg.assets.c1.hashes.exact).toBeNull() // input untouched
  })
})
describe('runConsolidation', () => {
  it('happy path: all fetches succeed, site unchanged, delete-files POSTed only after both PUTs succeed', async () => {
    global.fetch
      .mockReturnValueOnce(json({})) // library PUT
      .mockReturnValueOnce(json({})) // delete-files POST
    const libraryConfig = {
      assets: {
        a1: { assetId: 'a1', publicUrl: 'https://example.com/a.jpg', hashes: { exact: 'h1' } },
        a2: { assetId: 'a2', publicUrl: 'https://example.com/b.jpg', hashes: { exact: 'h1' } },
      },
      galleries: {},
      portfolios: {},
      sets: {},
      assetOrder: ['a1', 'a2'],
    }
    const siteConfig = { pages: [] }
    const decisions = [{ canonicalId: 'a1', redundantIds: ['a2'] }]
    const result = await runConsolidation({ libraryConfig, siteConfig, decisions })
    expect(result).toEqual({ mergedCount: 1, groupCount: 1, deletedFiles: 1 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    const calls = global.fetch.mock.calls
    expect(calls[0][0]).toBe('/api/admin/library')
    expect(calls[0][1].method).toBe('PUT')
    expect(calls[1][0]).toBe('/api/admin/dedup/delete-files')
    expect(calls[1][1].method).toBe('POST')
  })
  it('persist-fails-no-delete: library PUT fails with 500, throws error, NO delete-files POST made', async () => {
    global.fetch.mockReturnValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
    const libraryConfig = {
      assets: {
        a1: { assetId: 'a1', publicUrl: 'https://example.com/a.jpg', hashes: { exact: 'h1' } },
        a2: { assetId: 'a2', publicUrl: 'https://example.com/b.jpg', hashes: { exact: 'h1' } },
      },
      galleries: {},
      portfolios: {},
      sets: {},
      assetOrder: ['a1', 'a2'],
    }
    const siteConfig = { pages: [] }
    const decisions = [{ canonicalId: 'a1', redundantIds: ['a2'] }]
    await expect(runConsolidation({ libraryConfig, siteConfig, decisions })).rejects.toThrow('Failed to save the library (HTTP 500)')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const calls = global.fetch.mock.calls
    expect(calls[0][0]).toBe('/api/admin/library')
  })
})
