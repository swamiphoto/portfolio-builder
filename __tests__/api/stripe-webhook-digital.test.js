// __tests__/api/stripe-webhook-digital.test.js
const constructEvent = jest.fn()
jest.mock('../../common/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEvent } }) }))
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada' })) }))
jest.mock('../../common/userProfile', () => ({ readUserProfile: jest.fn(async () => ({ email: 'p@x.com' })) }))
jest.mock('../../common/fulfillment/placeOrderForPaidOrder', () => ({ placeOrderForPaidOrder: jest.fn() }))
const readEngagement = jest.fn()
const writeEngagement = jest.fn(async () => {})
jest.mock('../../common/clientEngagement', () => ({ readEngagement: (...a) => readEngagement(...a), writeEngagement: (...a) => writeEngagement(...a) }))

import { getOrder } from '../../common/orders'
import { placeOrderForPaidOrder } from '../../common/fulfillment/placeOrderForPaidOrder'
import handler from '../../pages/api/stripe/webhook'

function res() { return { statusCode: 200, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this} } }
async function reqObj() { const r = { method: 'POST', headers: { 'stripe-signature': 'sig' } }; r[Symbol.asyncIterator] = async function*(){ yield Buffer.from('{}') }; return r }

const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD, STRIPE_WEBHOOK_SECRET: 'whsec' } })
afterEach(() => { process.env = OLD })

it('grants credits for a paid digital order and does not place a lab order', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: {
    metadata: { orderId: 'ord_d', userId: 'u1', type: 'digital' }, payment_intent: 'pi_9',
  } } })
  getOrder.mockResolvedValue({
    id: 'ord_d', userId: 'u1', type: 'digital', status: 'pending', pageId: 'p1',
    credits: 10, buyer: { email: 'Mia@x.com' },
  })
  readEngagement.mockResolvedValue({ people: {}, downloads: [], entitlements: {} })
  const r = res()
  await handler(await reqObj(), r)
  expect(r.statusCode).toBe(200)
  expect(placeOrderForPaidOrder).not.toHaveBeenCalled()
  const written = writeEngagement.mock.calls[0]
  expect(written[0]).toBe('u1')
  expect(written[1]).toBe('p1')
  expect(written[2].entitlements['mia@x.com']).toMatchObject({ credits: 10, orders: ['ord_d'] })
})

it('ignores an already-paid digital order (idempotent)', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: {
    metadata: { orderId: 'ord_d', userId: 'u1', type: 'digital' },
  } } })
  getOrder.mockResolvedValue({ id: 'ord_d', userId: 'u1', type: 'digital', status: 'paid', pageId: 'p1', credits: 10, buyer: { email: 'mia@x.com' } })
  const r = res()
  await handler(await reqObj(), r)
  expect(r.statusCode).toBe(200)
  expect(writeEngagement).not.toHaveBeenCalled()
})
