// __tests__/api/purchaseCheckout.test.js
jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), normalizePrintStore: (c) => c }))
jest.mock('../../common/orders', () => ({ newOrderId: () => 'ord_test', saveOrder: jest.fn(async (_u, o) => o) }))
const create = jest.fn(async () => ({ id: 'cs_1', url: 'https://stripe/checkout/cs_1' }))
jest.mock('../../common/stripe/client', () => ({ getStripe: () => ({ checkout: { sessions: { create } } }) }))

import { readSiteConfig } from '../../common/siteConfig'
import { saveOrder } from '../../common/orders'
import handler from '../../pages/api/client/purchase/checkout'

function res() {
  return { statusCode: 200, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this} }
}
function req(body) {
  return { method: 'POST', headers: { origin: 'https://ada.sepia.photo' }, body }
}

const STORE = {
  printStore: { enabled: true, chargesEnabled: true, stripeConnectAccountId: 'acct_1', platformFeePct: 10, currency: 'USD' },
  pages: [{ id: 'p1', slug: 'gallery', clientFeatures: { enabled: true, downloads: { enabled: true }, purchase: {
    enabled: true, freeAllowance: 2, currency: 'USD',
    packages: [{ id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 }],
  } } }],
}

beforeEach(() => { jest.clearAllMocks(); delete process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT; delete process.env.PLATFORM_FEE_PCT })

it('creates a pending digital order and a Stripe session on the connected account', async () => {
  readSiteConfig.mockResolvedValue(STORE)
  const r = res()
  await handler(req({ username: 'ada', pageId: 'p1', packageId: 'pkg_all', buyer: { email: 'mia@x.com', name: 'Mia' }, returnPath: '/gallery' }), r)
  expect(r.statusCode).toBe(200)
  expect(r.body).toEqual({ url: 'https://stripe/checkout/cs_1' })
  // Session created with the connected account option
  expect(create).toHaveBeenCalledWith(expect.any(Object), { stripeAccount: 'acct_1' })
  // Order saved as a pending digital order with the right credits + fee
  const saved = saveOrder.mock.calls[0][1]
  expect(saved).toMatchObject({
    type: 'digital', status: 'pending', pageId: 'p1', packageId: 'pkg_all',
    credits: 'all', label: 'Entire gallery',
    amounts: { retail: 15000, platformFee: 1500, applicationFee: 1500, total: 15000, currency: 'USD' },
  })
})

it('rejects when the store is not ready for checkout', async () => {
  readSiteConfig.mockResolvedValue({ ...STORE, printStore: { ...STORE.printStore, chargesEnabled: false } })
  const r = res()
  await handler(req({ username: 'ada', pageId: 'p1', packageId: 'pkg_all', buyer: { email: 'mia@x.com' }, returnPath: '/gallery' }), r)
  expect(r.statusCode).toBe(403)
})

it('rejects an unknown package', async () => {
  readSiteConfig.mockResolvedValue(STORE)
  const r = res()
  await handler(req({ username: 'ada', pageId: 'p1', packageId: 'nope', buyer: { email: 'mia@x.com' }, returnPath: '/gallery' }), r)
  expect(r.statusCode).toBe(400)
})
