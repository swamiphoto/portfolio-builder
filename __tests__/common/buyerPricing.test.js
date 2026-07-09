import { optionPrice, startingPrice } from '../../common/print/buyerPricing'
import { computeRetail, lineCost } from '../../common/print/pricing'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('optionPrice', () => {
  it('equals computeRetail(lineCost(spec), markup)', () => {
    const spec = { size: '16x24', finish: 'lustre', frame: 'wood', matte: true }
    expect(optionPrice(SEED_CATALOG, spec, 3)).toBe(computeRetail(lineCost(SEED_CATALOG, spec), 3))
  })
})

describe('startingPrice', () => {
  it('is the cheapest unframed option across sizes and finishes', () => {
    const price = startingPrice(SEED_CATALOG, ['8x10', '16x24'], 3)
    // cheapest is the smallest size, cheapest finish, no frame, no mat
    const cheapest = Math.min(
      ...['8x10', '16x24'].flatMap(size =>
        SEED_CATALOG.finishes.map(f => optionPrice(SEED_CATALOG, { size, finish: f.id, frame: 'none', matte: false }, 3))
      )
    )
    expect(price).toBe(cheapest)
  })

  it('returns null when there are no available sizes', () => {
    expect(startingPrice(SEED_CATALOG, [], 3)).toBe(null)
  })
})
