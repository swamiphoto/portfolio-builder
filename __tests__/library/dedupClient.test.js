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

const baseLibrary = {
  assets: {
    a1: { assetId: 'a1', publicUrl: 'https://example.com/a.jpg', hashes: { exact: 'h1' } },
    a2: { assetId: 'a2', publicUrl: 'https://example.com/b.jpg', hashes: { exact: 'h1' } },
  },
  galleries: {},
  portfolios: {},
  sets: {},
  assetOrder: ['a1', 'a2'],
}

describe('runConsolidation', () => {
  it('happy path: delete-files returns deleted:1, summary has deletedFiles:1 failedDeletes:0', async () => {
    global.fetch
      .mockReturnValueOnce(json({})) // library PUT
      .mockReturnValueOnce({ ok: true, status: 200, json: async () => ({ deleted: 1, failed: [] }) }) // delete-files POST
    const decisions = [{ canonicalId: 'a1', redundantIds: ['a2'] }]
    const result = await runConsolidation({ libraryConfig: baseLibrary, siteConfig: { pages: [] }, decisions })
    expect(result.deletedFiles).toBe(1)
    expect(result.failedDeletes).toBe(0)
    expect(result.mergedCount).toBe(1)
    expect(result.groupCount).toBe(1)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    const calls = global.fetch.mock.calls
    expect(calls[0][0]).toBe('/api/admin/library')
    expect(calls[0][1].method).toBe('PUT')
    expect(calls[1][0]).toBe('/api/admin/dedup/delete-files')
    expect(calls[1][1].method).toBe('POST')
  })

  it('delete-files returns deleted:0 failed:[{url,reason}] → failedDeletes:1, still resolves, library PUT happened', async () => {
    const url = 'https://example.com/b.jpg'
    global.fetch
      .mockReturnValueOnce(json({})) // library PUT
      .mockReturnValueOnce({ ok: true, status: 200, json: async () => ({ deleted: 0, failed: [{ url, reason: 'x' }] }) }) // delete-files POST
    const decisions = [{ canonicalId: 'a1', redundantIds: ['a2'] }]
    const result = await runConsolidation({ libraryConfig: baseLibrary, siteConfig: { pages: [] }, decisions })
    expect(result.failedDeletes).toBe(1)
    expect(result.deletedFiles).toBe(0)
    // library PUT still happened
    expect(global.fetch.mock.calls[0][0]).toBe('/api/admin/library')
  })

  it('persist-fails-no-delete: library PUT fails with 500, throws error, NO delete-files POST made', async () => {
    global.fetch.mockReturnValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
    const decisions = [{ canonicalId: 'a1', redundantIds: ['a2'] }]
    await expect(runConsolidation({ libraryConfig: baseLibrary, siteConfig: { pages: [] }, decisions })).rejects.toThrow('Failed to save the library (HTTP 500)')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const calls = global.fetch.mock.calls
    expect(calls[0][0]).toBe('/api/admin/library')
  })
})
