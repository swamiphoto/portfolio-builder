import {
  roundPrice,
  computeRetail,
  lineCost,
  buildPriceMatrix,
} from '../../common/print/pricing'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('roundPrice', () => {
  it('rounds up to the nearest 5', () => {
    expect(roundPrice(31)).toBe(35)
    expect(roundPrice(35)).toBe(35)
    expect(roundPrice(0)).toBe(0)
  })
})

describe('computeRetail', () => {
  it('applies markup then rounds up to nearest 5', () => {
    expect(computeRetail(22, 3)).toBe(70) // 66 -> 70
  })
})

describe('lineCost', () => {
  it('sums size finish cost + frame cost + matte cost', () => {
    // 16x24 lustre (22) + wood (35) + matte (8) = 65
    expect(lineCost(SEED_CATALOG, { size: '16x24', finish: 'lustre', frame: 'wood', matte: true })).toBe(65)
  })

  it('ignores matte cost when unframed', () => {
    // matte flag ignored because frame none has no mat -> 22 + 0
    expect(lineCost(SEED_CATALOG, { size: '16x24', finish: 'lustre', frame: 'none', matte: true })).toBe(22)
  })

  it('throws on an unknown size', () => {
    expect(() => lineCost(SEED_CATALOG, { size: '99x99', finish: 'lustre', frame: 'none', matte: false })).toThrow('unknown size')
  })
})

describe('buildPriceMatrix', () => {
  it('produces one row per size x finish x frame (+ matte only when framed)', () => {
    const rows = buildPriceMatrix(SEED_CATALOG, ['8x10'], 3)
    // 3 finishes x [none, wood(no-mat), wood(mat), metal(no-mat), metal(mat)] = 3 x 5 = 15
    expect(rows.length).toBe(15)
    const noneRow = rows.find((r) => r.finish === 'lustre' && r.frame === 'none')
    expect(noneRow.labCost).toBe(6)
    expect(noneRow.retail).toBe(computeRetail(6, 3))
  })
})
