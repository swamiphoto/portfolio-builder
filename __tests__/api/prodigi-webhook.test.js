// __tests__/api/prodigi-webhook.test.js
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn(async () => ({ sent: true })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada Photo' })) }))
import { getOrder, saveOrder } from '../../common/orders'
import { sendMail } from '../../common/email/mailer'
import handler from '../../pages/api/prodigi/webhook'

function res() { return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } } }
function shippedBody() {
  return { order: {
    merchantReference: 'u1:ord_1',
    status: { stage: 'Complete' },
    shipments: [{ carrier: { name: 'DHL' }, tracking: { number: 'TRK1', url: 'https://track/TRK1' } }],
  } }
}
const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD }; delete process.env.PRODIGI_WEBHOOK_SECRET })
afterEach(() => { process.env = OLD })

it('marks the order shipped, stores tracking, and emails the buyer', async () => {
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'placed', spec: { size: '16x20', finish: 'lustre', frame: 'none' }, buyer: { email: 'ada@example.com' }, amounts: { currency: 'USD' }, fulfillment: {} })
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
  const saved = saveOrder.mock.calls[0][1]
  expect(saved.fulfillment.tracking).toEqual({ carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' })
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }))
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

it('still returns 200 if the buyer email throws (email is best-effort)', async () => {
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'placed', spec: { size: '16x20', finish: 'lustre', frame: 'none' }, buyer: { email: 'ada@example.com' }, amounts: { currency: 'USD' }, fulfillment: {} })
  sendMail.mockRejectedValueOnce(new Error('SMTP down'))
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
})
