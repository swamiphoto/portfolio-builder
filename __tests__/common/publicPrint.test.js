import { publicPrintForAsset, publicPrintStore } from '../../common/print/publicPrint'

describe('publicPrintForAsset', () => {
  it('returns null when the asset is not sellable', () => {
    expect(publicPrintForAsset({ print: { sellable: false } })).toBe(null)
    expect(publicPrintForAsset({})).toBe(null)
  })

  it('returns the public subset when sellable', () => {
    const asset = { print: { sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10', masterStorageKey: 'secret/x.jpg' } }
    expect(publicPrintForAsset(asset)).toEqual({ sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10' })
  })
})

describe('publicPrintStore', () => {
  it('returns only public fields with defaults, never internal ones', () => {
    const cfg = { printStore: { enabled: true, markup: 2.5, currency: 'USD', showPriceOnImage: true, stripeConnectAccountId: 'acct_secret', platformFeePct: 0 } }
    expect(publicPrintStore(cfg)).toEqual({ enabled: true, markup: 2.5, currency: 'USD', showPriceOnImage: true })
  })

  it('applies safe defaults when printStore is missing', () => {
    expect(publicPrintStore({})).toEqual({ enabled: false, markup: 3, currency: 'USD', showPriceOnImage: false })
  })
})
