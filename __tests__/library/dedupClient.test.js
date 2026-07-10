import { backfillHashes, applyHashes } from '@/common/library/dedupClient'

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
