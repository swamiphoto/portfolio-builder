// __tests__/common/prodigiAdapter.test.js
jest.mock('../../common/fulfillment/prodigiClient', () => ({
  prodigiFetch: jest.fn(),
}))
import { prodigiFetch } from '../../common/fulfillment/prodigiClient'
import { prodigiAdapter } from '../../common/fulfillment/prodigi'
import { mockLabAdapter } from '../../common/fulfillment/mockLabAdapter'
import { getAdapterForCountry } from '../../common/fulfillment/router'

const sampleOrder = {
  id: 'ord_1', userId: 'u1',
  spec: { size: '16x20', finish: 'lustre', frame: 'none' },
  buyer: { name: 'Ada', email: 'ada@example.com', address: { line1: '1 St', townOrCity: 'NYC', stateOrCounty: 'NY', postalCode: '10001', country: 'US' } },
  print: { imageUrl: 'https://cdn.example.com/print.jpg' },
}

describe('prodigiAdapter pricing parity with mock', () => {
  it('getCost matches the mock (seed catalog)', () => {
    expect(prodigiAdapter.getCost(sampleOrder.spec)).toEqual(mockLabAdapter.getCost(sampleOrder.spec))
  })
  it('getShippingQuote matches the mock', () => {
    const addr = sampleOrder.buyer.address
    expect(prodigiAdapter.getShippingQuote(sampleOrder.spec, addr)).toEqual(mockLabAdapter.getShippingQuote(sampleOrder.spec, addr))
  })
})

describe('prodigiAdapter.placeOrder', () => {
  beforeEach(() => prodigiFetch.mockReset())

  it('POSTs an order with merchantReference, recipient, and asset URL, returns labOrderId', async () => {
    prodigiFetch.mockResolvedValue({ order: { id: 'ord_prodigi_9', status: { stage: 'InProgress' } } })
    const out = await prodigiAdapter.placeOrder(sampleOrder)
    expect(out).toEqual({ labOrderId: 'ord_prodigi_9', status: 'placed' })

    const [path, opts] = prodigiFetch.mock.calls[0]
    expect(path).toBe('/v4.0/Orders')
    expect(opts.method).toBe('POST')
    expect(opts.body.merchantReference).toBe('u1:ord_1')
    expect(opts.body.recipient.email).toBe('ada@example.com')
    expect(opts.body.recipient.address.countryCode).toBe('US')
    expect(opts.body.items[0].sku).toBe('GLOBAL-PAP-16X20') // lustre -> photographic
    expect(opts.body.items[0].assets[0].url).toBe('https://cdn.example.com/print.jpg')
  })

  it('omits empty optional address fields (Prodigi rejects empty line2 / stateOrCounty)', async () => {
    prodigiFetch.mockResolvedValue({ order: { id: 'ord_x', status: { stage: 'InProgress' } } })
    const noLine2 = { ...sampleOrder, buyer: { ...sampleOrder.buyer, address: { line1: '1 St', townOrCity: 'NYC', stateOrCounty: 'NY', postalCode: '10001', country: 'US' } } }
    await prodigiAdapter.placeOrder(noLine2)
    const addr = prodigiFetch.mock.calls[0][1].body.recipient.address
    expect(addr).not.toHaveProperty('line2')
    expect(addr.line1).toBe('1 St')
    expect(addr.stateOrCounty).toBe('NY')
  })

  it('includes line2 when present', async () => {
    prodigiFetch.mockResolvedValue({ order: { id: 'ord_x', status: { stage: 'InProgress' } } })
    const withLine2 = { ...sampleOrder, buyer: { ...sampleOrder.buyer, address: { ...sampleOrder.buyer.address, line2: 'Apt 4' } } }
    await prodigiAdapter.placeOrder(withLine2)
    expect(prodigiFetch.mock.calls[0][1].body.recipient.address.line2).toBe('Apt 4')
  })

  it('rejects with "no order id" when Prodigi returns a body without order.id', async () => {
    prodigiFetch.mockResolvedValue({})
    await expect(prodigiAdapter.placeOrder(sampleOrder)).rejects.toThrow(/no order id/)
  })
})

describe('prodigiAdapter.getTracking', () => {
  beforeEach(() => prodigiFetch.mockReset())

  it('reports shipped with carrier/number when a shipment exists', async () => {
    prodigiFetch.mockResolvedValue({
      order: { status: { stage: 'Complete' }, shipments: [{ carrier: { name: 'DHL' }, tracking: { number: 'TRK1', url: 'https://track/TRK1' } }] },
    })
    const out = await prodigiAdapter.getTracking('ord_prodigi_9')
    expect(prodigiFetch).toHaveBeenCalledWith('/v4.0/Orders/ord_prodigi_9')
    expect(out).toEqual({ status: 'shipped', tracking: { carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' } })
  })

  it('reports in-progress with null tracking when no shipment yet', async () => {
    prodigiFetch.mockResolvedValue({ order: { status: { stage: 'InProgress' }, shipments: [] } })
    const out = await prodigiAdapter.getTracking('ord_prodigi_9')
    expect(out).toEqual({ status: 'placed', tracking: null })
  })
})

describe('prodigiAdapter.getQuote', () => {
  beforeEach(() => prodigiFetch.mockReset())

  it('returns cost + shipping + currency from a Prodigi quote for the SKU + destination', async () => {
    prodigiFetch.mockResolvedValue({ quotes: [{ costSummary: { items: { amount: '15.00', currency: 'USD' }, shipping: { amount: '7.10', currency: 'USD' } } }] })
    const out = await prodigiAdapter.getQuote({ size: '16x20', finish: 'matte', frame: 'none' }, { country: 'US' })
    expect(out).toEqual({ cost: 15, shipping: 7.1, currency: 'USD' })
    const [path, opts] = prodigiFetch.mock.calls[0]
    expect(path).toBe('/v4.0/quotes')
    expect(opts.body.destinationCountryCode).toBe('US')
    expect(opts.body.items[0].sku).toBe('GLOBAL-FAP-16X20')
  })

  it('falls back to seed pricing when the Prodigi quote fails', async () => {
    prodigiFetch.mockRejectedValue(new Error('prodigi 500'))
    const out = await prodigiAdapter.getQuote({ size: '16x20', finish: 'matte', frame: 'none' }, { country: 'US' })
    expect(out).toEqual(mockLabAdapter.getQuote({ size: '16x20', finish: 'matte', frame: 'none' }, { country: 'US' }))
  })
})

describe('getAdapterForCountry', () => {
  const OLD = process.env
  afterEach(() => { process.env = OLD })
  it('returns the mock when PRODIGI_API_KEY is unset', () => {
    process.env = { ...OLD }; delete process.env.PRODIGI_API_KEY
    expect(getAdapterForCountry('US')).toBe(mockLabAdapter)
  })
  it('returns the Prodigi adapter when PRODIGI_API_KEY is set', () => {
    process.env = { ...OLD, PRODIGI_API_KEY: 'k' }
    expect(getAdapterForCountry('US')).toBe(prodigiAdapter)
  })
})
