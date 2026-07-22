// __tests__/common/digitalAmounts.test.js
import { buildDigitalAmounts } from '@/common/purchase/digitalAmounts'

describe('buildDigitalAmounts', () => {
  it('splits a digital sale with no printCost/shipping', () => {
    expect(buildDigitalAmounts({ price: 15000, platformFeePct: 10, currency: 'USD' })).toEqual({
      retail: 15000,
      platformFee: 1500,     // 10% of 15000
      applicationFee: 1500,  // == platformFee (no lab cost)
      total: 15000,          // == retail (no shipping)
      profit: 13500,         // retail - platformFee
      currency: 'USD',
    })
  })

  it('clamps platformFee to retail when platformFeePct > 100', () => {
    const a = buildDigitalAmounts({ price: 5000, platformFeePct: 150 })
    expect(a.platformFee).toBe(5000)
    expect(a.applicationFee).toBe(5000)
    expect(a.profit).toBe(0)
  })

  it('defaults platformFee to 0 and rounds to whole cents', () => {
    const a = buildDigitalAmounts({ price: 4001, platformFeePct: 15 })
    expect(a.platformFee).toBe(600) // round(4001 * 0.15) = round(600.15) = 600
    expect(a.applicationFee).toBe(600)
    expect(a.total).toBe(4001)
    expect(a.profit).toBe(3401)
    expect(a.currency).toBe('USD')
  })
})
