// __tests__/api/stripe-webhook.test.js
const constructEvent = jest.fn()
jest.mock('../../common/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEvent } }) }))
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada Photo', contact: {}, clientDefaults: { notificationEmail: 'me@sepia.so' } })) }))
jest.mock('../../common/userProfile', () => ({ readUserProfile: jest.fn(async () => ({ email: 'prof@sepia.so' })) }))
jest.mock('../../common/fulfillment/placeOrderForPaidOrder', () => ({
  placeOrderForPaidOrder: jest.fn(async (o) => ({ ...o, status: 'placed' })),
}))

import { getOrder } from '../../common/orders'
import { placeOrderForPaidOrder } from '../../common/fulfillment/placeOrderForPaidOrder'
import handler from '../../pages/api/stripe/webhook'

function mockRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
async function mockReq() {
  const req = { method: 'POST', headers: { 'stripe-signature': 'sig' } }
  req[Symbol.asyncIterator] = async function* () { yield Buffer.from('{}') }
  return req
}

const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD, STRIPE_WEBHOOK_SECRET: 'whsec' } })
afterEach(() => { process.env = OLD })

it('places the Prodigi order after a paid checkout session', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: { metadata: { orderId: 'ord_1', userId: 'u1' }, payment_intent: 'pi_1' } } })
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'pending', buyer: { address: { country: 'US' } }, amounts: {}, fulfillment: {} })
  const res = mockRes()
  await handler(await mockReq(), res)
  expect(res.statusCode).toBe(200)
  expect(placeOrderForPaidOrder).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'paid' }),
    expect.objectContaining({ photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' }),
  )
})

it('ignores an already-paid order (idempotent) and still 200s', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: { metadata: { orderId: 'ord_1', userId: 'u1' } } } })
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'placed', fulfillment: { labOrderId: 'p_9' } })
  const res = mockRes()
  await handler(await mockReq(), res)
  expect(res.statusCode).toBe(200)
  expect(placeOrderForPaidOrder).not.toHaveBeenCalled()
})
