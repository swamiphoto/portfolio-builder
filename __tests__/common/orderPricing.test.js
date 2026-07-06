import { buildAmounts } from '../../common/print/orderPricing'

describe('buildAmounts', () => {
  it('computes the split (spec §3)', () => {
    const a = buildAmounts({ retail: 17000, printCost: 6500, shippingCost: 1200, platformFeePct: 10, currency: 'USD' })
    expect(a).toEqual({
      retail: 17000, printCost: 6500, shippingCost: 1200,
      platformFee: 1700,                 // 10% of 17000
      total: 18200,                      // retail + shipping
      applicationFee: 9400,              // 6500 + 1200 + 1700
      profit: 8800,                      // 17000 - 6500 - 1700
      currency: 'USD',
    })
  })

  it('defaults platformFee to 0', () => {
    const a = buildAmounts({ retail: 7000, printCost: 2400, shippingCost: 1000 })
    expect(a.platformFee).toBe(0)
    expect(a.applicationFee).toBe(3400)
    expect(a.profit).toBe(4600)
    expect(a.total).toBe(8000)
  })

  it('throws when the markup is too low (fee would exceed the charge)', () => {
    // retail below printCost: profit negative, app fee > total
    expect(() => buildAmounts({ retail: 2000, printCost: 2400, shippingCost: 1000 })).toThrow('markup too low')
  })
})
