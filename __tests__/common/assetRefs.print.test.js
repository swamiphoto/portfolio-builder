import { normalizeImageRef } from '../../common/assetRefs'

describe('normalizeImageRef print passthrough', () => {
  it('preserves a print field when present', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg', print: { sellable: true, availableSizes: ['8x10'] } })
    expect(ref.print).toEqual({ sellable: true, availableSizes: ['8x10'] })
  })

  it('omits print when the input has none', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg' })
    expect('print' in ref).toBe(false)
  })
})
