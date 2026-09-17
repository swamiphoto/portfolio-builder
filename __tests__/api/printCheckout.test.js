// __tests__/api/printCheckout.test.js
/** @jest-environment node */
jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({
  readPublishedSiteConfig: jest.fn(async () => ({})),
  normalizePrintStore: jest.fn(() => ({
    printStore: {
      enabled: true, chargesEnabled: true, stripeConnectAccountId: 'acct_1', markup: 3, currency: 'USD',
      platformFeePct: 0, shippingMethod: 'budget', freeShipping: true, shippingBuffer: 900, priceRounding: 'charm9',
    },
  })),
}))
jest.mock('../../common/adminConfig', () => ({
  readLibraryConfig: jest.fn(async () => ({ assets: { a1: { assetId: 'a1', publicUrl: 'u' } } })),
}))
jest.mock('../../common/print/publicPrint', () => ({
  publicPrintForAsset: jest.fn(() => ({ availableSizes: ['16x20'] })),
  printImageRef: jest.fn(() => ({ imageUrl: 'x' })),
}))
jest.mock('../../common/fulfillment/router', () => ({ getAdapterForCountry: jest.fn(() => ({})) }))
jest.mock('../../common/print/quoteOrder', () => ({
  quoteOrder: jest.fn(async () => ({ total: 7800, shippingCost: 0, shippingFree: true, shippingMethod: 'standard' })),
}))
jest.mock('../../common/orders', () => ({ newOrderId: () => 'ord_1', saveOrder: jest.fn(async () => {}) }))
jest.mock('../../common/stripe/client', () => ({
  getStripe: jest.fn(() => ({ checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'sess_1', url: 'https://pay' }) } } })),
}))
jest.mock('../../common/stripe/checkout', () => ({ buildCheckoutSessionParams: jest.fn(() => ({})) }))
jest.mock('../../common/domainUtils', () => ({ siteUrlFor: jest.fn(() => 'https://site') }))
jest.mock('../../common/homePage', () => ({ resolveHomePage: jest.fn(() => null) }))
jest.mock('../../common/pageUtils', () => ({ effectivePageSlug: jest.fn(() => '') }))

import handler from '../../pages/api/print/checkout'
import { quoteOrder } from '../../common/print/quoteOrder'
import { saveOrder } from '../../common/orders'

function res() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}

const req = {
  method: 'POST',
  headers: {},
  body: { username: 'jane', assetId: 'a1', spec: { size: '16x20' }, buyer: { email: 'b@x.co', address: { country: 'US' } } },
}

beforeEach(() => { jest.clearAllMocks() })

it('applies the store shipping options to quoteOrder and persists the resolved method on the order', async () => {
  const r = res()
  await handler(req, r)

  expect(r.statusCode).toBe(200)
  expect(quoteOrder).toHaveBeenCalledWith(
    expect.objectContaining({
      shippingMethod: 'budget',
      freeShipping: true,
      shippingBuffer: 900,
      rounding: 'charm9',
    })
  )

  expect(saveOrder).toHaveBeenCalledTimes(1)
  const savedOrder = saveOrder.mock.calls[0][1]
  expect(savedOrder.fulfillment.shippingMethod).toBe('standard')
})
