// __tests__/common/sellAsset.test.js
import { resolveSellableAsset } from '../../common/print/sellAsset'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('resolveSellableAsset', () => {
  it('computes availableSizes + maxSharpSize + priceMatrix from asset dimensions', () => {
    const asset = { width: 6000, height: 4000, print: { sellable: false, minDpi: 240 } }
    const { print, priceMatrix } = resolveSellableAsset(asset, SEED_CATALOG, 3)
    expect(print.sellable).toBe(true)
    expect(print.availableSizes).toContain('8x10')
    expect(print.maxSharpSize).toBe('16x24')
    expect(priceMatrix.length).toBeGreaterThan(0)
  })

  it('prefers print-master dimensions over the asset dimensions', () => {
    const asset = {
      width: 1200, height: 800,
      print: { sellable: false, minDpi: 240, masterWidth: 8640, masterHeight: 5760 },
    }
    const { print } = resolveSellableAsset(asset, SEED_CATALOG, 3)
    expect(print.maxSharpSize).toBe('24x36')
  })

  it('unselling clears sizes and price matrix', () => {
    const asset = { width: 6000, height: 4000, print: { sellable: true, minDpi: 240 } }
    const { print, priceMatrix } = resolveSellableAsset({ ...asset }, SEED_CATALOG, 3, false)
    expect(print.sellable).toBe(false)
    expect(print.availableSizes).toEqual([])
    expect(print.maxSharpSize).toBe(null)
    expect(priceMatrix).toEqual([])
  })
})
