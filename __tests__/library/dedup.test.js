import { assetsMissingHash, groupDuplicates, chooseCanonical } from '@/common/library/dedup'

const A = {
  a1: { assetId: 'a1', publicUrl: 'u1', hashes: { exact: 'H' }, usage: { usageCount: 1 }, createdAt: '2026-01-02' },
  a2: { assetId: 'a2', publicUrl: 'u2', hashes: { exact: 'H' }, usage: { usageCount: 5 }, createdAt: '2026-01-03' },
  a3: { assetId: 'a3', publicUrl: 'u3', hashes: { exact: 'H' }, usage: { usageCount: 5 }, createdAt: '2026-01-01' },
  b1: { assetId: 'b1', publicUrl: 'u4', hashes: { exact: 'K' } },        // singleton
  c1: { assetId: 'c1', publicUrl: 'u5', hashes: { exact: null } },       // needs hash
  c2: { assetId: 'c2', publicUrl: 'u6' },                                // no hashes obj
}

describe('assetsMissingHash', () => {
  it('lists assets without an exact hash, with their url', () => {
    expect(assetsMissingHash(A)).toEqual([{ assetId: 'c1', url: 'u5' }, { assetId: 'c2', url: 'u6' }])
  })
})
describe('groupDuplicates', () => {
  it('groups assetIds by shared non-empty exact hash, ignoring singletons/missing', () => {
    const g = groupDuplicates(A)
    expect(g).toHaveLength(1)
    expect(g[0].hash).toBe('H')
    expect(g[0].assetIds.sort()).toEqual(['a1', 'a2', 'a3'])
  })
})
describe('chooseCanonical', () => {
  it('picks highest usageCount, then oldest createdAt, then smallest id', () => {
    // a2 & a3 both usage 5; a3 is older -> a3 wins
    expect(chooseCanonical(A, ['a1', 'a2', 'a3'])).toBe('a3')
  })
})
