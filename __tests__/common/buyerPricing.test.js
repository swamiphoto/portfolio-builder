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

describe('rounding pass-through', () => {
  const spec = { size: '8x10', finish: 'lustre', frame: 'none', matte: false }

  it('optionPrice defaults to nearest5 rounding', () => {
    // lineCost 6 * markup 3 = 18 -> nearest5 rounds up to 20
    expect(optionPrice(SEED_CATALOG, spec, 3)).toBe(20)
  })

  it('optionPrice applies charm9 rounding when requested', () => {
    // lineCost 6 * markup 3 = 18 -> charm9 rounds up to 19
    expect(optionPrice(SEED_CATALOG, spec, 3, 'charm9')).toBe(19)
  })

  it('startingPrice passes rounding through to each optionPrice call', () => {
    expect(startingPrice(SEED_CATALOG, ['8x10'], 3, 'charm9')).toBe(19)
    expect(startingPrice(SEED_CATALOG, ['8x10'], 3, 'nearest5')).toBe(20)
  })
})
