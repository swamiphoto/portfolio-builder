// __tests__/common/placeOrderForPaidOrder.test.js
jest.mock('../../common/orders', () => ({ saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn(async () => ({ sent: true })) }))
const placeOrder = jest.fn()
jest.mock('../../common/fulfillment/router', () => ({ getAdapterForCountry: () => ({ placeOrder }) }))

import { saveOrder } from '../../common/orders'
import { sendMail } from '../../common/email/mailer'
import { placeOrderForPaidOrder } from '../../common/fulfillment/placeOrderForPaidOrder'

function baseOrder() {
  return {
    id: 'ord_1', userId: 'u1', status: 'paid',
    spec: { size: '16x20', finish: 'lustre', frame: 'none' },
    buyer: { name: 'Ada', email: 'ada@example.com', address: { country: 'US' } },
    amounts: { profit: 10500, currency: 'USD' },
    print: { imageUrl: 'https://cdn/x.jpg' },
    fulfillment: { lab: 'prodigi', labOrderId: null, status: 'none', tracking: null },
  }
}

beforeEach(() => { jest.clearAllMocks() })

describe('placeOrderForPaidOrder', () => {
  it('places the order, stores labOrderId, sets status placed, and emails the photographer', async () => {
    placeOrder.mockResolvedValue({ labOrderId: 'p_9', status: 'placed' })
    const out = await placeOrderForPaidOrder(baseOrder(), { photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' })
    expect(out.status).toBe('placed')
    expect(out.fulfillment.labOrderId).toBe('p_9')
    expect(out.fulfillment.status).toBe('placed')
    expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'placed' }))
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'me@sepia.so' }))
  })

  it('is idempotent — does nothing if labOrderId is already set', async () => {
    const o = baseOrder(); o.fulfillment.labOrderId = 'p_existing'; o.status = 'placed'
    const out = await placeOrderForPaidOrder(o, { photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' })
    expect(placeOrder).not.toHaveBeenCalled()
    expect(saveOrder).not.toHaveBeenCalled()
    expect(out.fulfillment.labOrderId).toBe('p_existing')
  })

  it('records fulfillment_failed (does not throw) when placement fails', async () => {
    placeOrder.mockRejectedValue(new Error('prodigi 422: bad sku'))
    const out = await placeOrderForPaidOrder(baseOrder(), { photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' })
    expect(out.status).toBe('fulfillment_failed')
    expect(out.fulfillment.status).toBe('failed')
    expect(out.fulfillment.error).toMatch(/bad sku/)
    expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'fulfillment_failed' }))
  })
})
