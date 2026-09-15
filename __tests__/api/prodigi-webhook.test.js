// __tests__/api/prodigi-webhook.test.js
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn(async () => ({ sent: true })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada Photo' })) }))
import { getOrder, saveOrder } from '../../common/orders'
import { sendMail } from '../../common/email/mailer'
import handler from '../../pages/api/prodigi/webhook'

function res() { return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } } }

// Prodigi callbacks are CloudEvents — the order lives at data.order.
function cloudEvent(order) {
  return { specversion: '1.0', type: 'com.prodigi.order.status.stage.changed', subject: 'ord_1', data: { order } }
}
function shippedOrder() {
  return {
    merchantReference: 'u1:ord_1',
    status: { stage: 'Complete' },
    shipments: [{ carrier: { name: 'DHL' }, dispatchDate: '2026-09-14T10:00:00Z', tracking: { number: 'TRK1', url: 'https://track/TRK1' } }],
  }
}
function shippedBody() { return cloudEvent(shippedOrder()) }
function placedOrder() {
  return { id: 'ord_1', userId: 'u1', status: 'placed', spec: { size: '16x20', finish: 'lustre', frame: 'none' }, buyer: { email: 'ada@example.com' }, amounts: { currency: 'USD' }, fulfillment: {} }
}
const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD }; delete process.env.PRODIGI_WEBHOOK_SECRET })
afterEach(() => { process.env = OLD })

it('reads the order from CloudEvents data.order, marks shipped, stores tracking, emails the buyer', async () => {
  getOrder.mockResolvedValue(placedOrder())
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(getOrder).toHaveBeenCalledWith('u1', 'ord_1')
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
  const saved = saveOrder.mock.calls[0][1]
  expect(saved.fulfillment.tracking).toEqual({ carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' })
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }))
})

it('also accepts a flat body.order payload (fallback)', async () => {
  getOrder.mockResolvedValue(placedOrder())
  const r = res()
  await handler({ method: 'POST', query: {}, body: { order: shippedOrder() } }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
})

it('treats a dispatched shipment while still InProgress as shipped', async () => {
  getOrder.mockResolvedValue(placedOrder())
  const order = shippedOrder()
  order.status = { stage: 'InProgress' } // multi-shipment order not yet Complete
  const r = res()
  await handler({ method: 'POST', query: {}, body: cloudEvent(order) }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
  expect(sendMail).toHaveBeenCalled()
})

it('leaves an InProgress order with no dispatched shipment untouched', async () => {
  getOrder.mockResolvedValue(placedOrder())
  const r = res()
  await handler({ method: 'POST', query: {}, body: cloudEvent({ merchantReference: 'u1:ord_1', status: { stage: 'InProgress' }, shipments: [] }) }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).not.toHaveBeenCalled()
  expect(sendMail).not.toHaveBeenCalled()
})

it('marks a Cancelled order canceled without emailing', async () => {
  getOrder.mockResolvedValue(placedOrder())
  const r = res()
  await handler({ method: 'POST', query: {}, body: cloudEvent({ merchantReference: 'u1:ord_1', status: { stage: 'Cancelled' } }) }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'canceled' }))
  expect(sendMail).not.toHaveBeenCalled()
})

it('is idempotent — skips an already-shipped order', async () => {
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'shipped', spec: {}, buyer: {}, fulfillment: {} })
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).not.toHaveBeenCalled()
  expect(sendMail).not.toHaveBeenCalled()
})

it('rejects a bad token when PRODIGI_WEBHOOK_SECRET is set', async () => {
  process.env.PRODIGI_WEBHOOK_SECRET = 'sekret'
  const r = res()
  await handler({ method: 'POST', query: { token: 'wrong' }, body: shippedBody() }, r)
  expect(r.statusCode).toBe(401)
  expect(getOrder).not.toHaveBeenCalled()
})

it('returns 500 and does not call getOrder when secret is unset in production', async () => {
  process.env.NODE_ENV = 'production'
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(500)
  expect(r.body).toMatchObject({ error: expect.stringMatching(/not configured/) })
  expect(getOrder).not.toHaveBeenCalled()
})

it('still returns 200 if the buyer email throws (email is best-effort)', async () => {
  getOrder.mockResolvedValue(placedOrder())
  sendMail.mockRejectedValueOnce(new Error('SMTP down'))
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
})
