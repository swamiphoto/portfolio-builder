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
      shippingFree: false,
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

describe('buildAmounts free shipping', () => {
  const base = { retail: 6000, printCost: 2000, shippingCost: 700, platformFeePct: 15, currency: 'USD' }
  it('standard mode is unchanged', () => {
    const a = buildAmounts(base)
    expect(a).toMatchObject({ total: 6700, shippingCost: 700, applicationFee: 2000 + 700 + 900, profit: 6000 - 2000 - 900, shippingFree: false })
  })
  it('free shipping folds the buffer into total, hides buyer shipping, keeps actual shipping in the fee', () => {
    const a = buildAmounts({ ...base, freeShipping: true, shippingBuffer: 1000 })
    expect(a.total).toBe(7000)                    // retail 6000 + buffer 1000
    expect(a.shippingCost).toBe(0)                // buyer sees free
    expect(a.actualShippingCost).toBe(700)
    expect(a.platformFee).toBe(900)               // 15% of retail (not buffer)
    expect(a.applicationFee).toBe(2000 + 700 + 900)
    expect(a.profit).toBe(7000 - (2000 + 700 + 900))
    expect(a.shippingFree).toBe(true)
  })
  it('guards when costs exceed the buyer charge (cheap print, pricey international)', () => {
    expect(() => buildAmounts({ retail: 1500, printCost: 2000, shippingCost: 3000, platformFeePct: 0, freeShipping: true, shippingBuffer: 500 }))
      .toThrow(/application fee exceeds/)
  })
})
