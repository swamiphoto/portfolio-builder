jest.mock('../../common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))
jest.mock('../../common/orders', () => ({ listOrders: jest.fn() }))
import { listOrders } from '../../common/orders'
import handler from '../../pages/api/admin/print/orders'

function res() { return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } } }

beforeEach(() => jest.clearAllMocks())

it('returns the caller\'s orders', async () => {
  listOrders.mockResolvedValue([{ id: 'ord_1', status: 'placed' }])
  const r = res()
  await handler({ method: 'GET' }, r)
  expect(listOrders).toHaveBeenCalledWith('u1')
  expect(r.statusCode).toBe(200)
  expect(r.body).toEqual({ orders: [{ id: 'ord_1', status: 'placed' }] })
})

it('405s on non-GET', async () => {
  const r = res()
  await handler({ method: 'POST' }, r)
  expect(r.statusCode).toBe(405)
})
