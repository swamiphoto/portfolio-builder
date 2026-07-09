import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('SEED_CATALOG', () => {
  it('has a currency and non-empty finishes, sizes, frames', () => {
    expect(SEED_CATALOG.currency).toBe('USD')
    expect(SEED_CATALOG.finishes.length).toBeGreaterThan(0)
    expect(SEED_CATALOG.sizes.length).toBeGreaterThan(0)
    expect(SEED_CATALOG.frames.length).toBeGreaterThan(0)
  })

  it('gives every size a cost for every finish', () => {
    const finishIds = SEED_CATALOG.finishes.map((f) => f.id)
    for (const size of SEED_CATALOG.sizes) {
      expect(typeof size.wIn).toBe('number')
      expect(typeof size.hIn).toBe('number')
      for (const fid of finishIds) {
        expect(typeof size.cost[fid]).toBe('number')
      }
    }
  })

  it('includes a "none" frame with zero cost', () => {
    const none = SEED_CATALOG.frames.find((f) => f.id === 'none')
    expect(none).toBeTruthy()
    expect(none.cost).toBe(0)
  })
})
