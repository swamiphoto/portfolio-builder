import { mockLabAdapter } from '../../common/fulfillment/mockLabAdapter'
import { getAdapterForCountry } from '../../common/fulfillment/router'

describe('mockLabAdapter', () => {
  it('returns the seed catalog', () => {
    expect(mockLabAdapter.getCatalog().currency).toBe('USD')
  })

  it('prices a line item', () => {
    const { cost, currency } = mockLabAdapter.getCost({ size: '8x10', finish: 'lustre', frame: 'none', matte: false })
    expect(cost).toBe(6)
    expect(currency).toBe('USD')
  })

  it('quotes cheaper domestic than international shipping', () => {
    const us = mockLabAdapter.getShippingQuote({}, { country: 'US' })
    const intl = mockLabAdapter.getShippingQuote({}, { country: 'JP' })
    expect(us.cost).toBeLessThan(intl.cost)
  })

  it('throws on placeOrder (not implemented in v1)', () => {
    expect(() => mockLabAdapter.placeOrder({}, {}, {})).toThrow('not implemented')
  })
})

describe('getAdapterForCountry', () => {
  it('returns the mock adapter for any country in v1', () => {
    expect(getAdapterForCountry('US')).toBe(mockLabAdapter)
    expect(getAdapterForCountry('FR')).toBe(mockLabAdapter)
  })
})
