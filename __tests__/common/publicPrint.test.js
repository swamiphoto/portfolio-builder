import { publicPrintForAsset, publicPrintStore, publicSiteConfig } from '../../common/print/publicPrint'

describe('publicPrintForAsset', () => {
  it('returns null when the asset is not sellable', () => {
    expect(publicPrintForAsset({ print: { sellable: false } })).toBe(null)
    expect(publicPrintForAsset({})).toBe(null)
  })

  it('returns the public subset when sellable', () => {
    const asset = { orientation: 'portrait', print: { sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10', masterStorageKey: 'secret/x.jpg' } }
    expect(publicPrintForAsset(asset)).toEqual({ sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10', orientation: 'portrait' })
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

describe('publicSiteConfig', () => {
  it('strips internal printStore fields but keeps other config', () => {
    const cfg = { siteName: 'X', pages: [], printStore: { enabled: true, markup: 2, currency: 'USD', showPriceOnImage: false, stripeConnectAccountId: 'acct_secret', platformFeePct: 5 } }
    const out = publicSiteConfig(cfg)
    expect(out.siteName).toBe('X')
    expect(out.printStore).toEqual({ enabled: true, markup: 2, currency: 'USD', showPriceOnImage: false })
    expect('stripeConnectAccountId' in out.printStore).toBe(false)
    expect('platformFeePct' in out.printStore).toBe(false)
  })

  it('returns siteConfig unchanged (pass-through) when falsy', () => {
    expect(publicSiteConfig(null)).toBe(null)
    expect(publicSiteConfig(undefined)).toBe(undefined)
  })
})
