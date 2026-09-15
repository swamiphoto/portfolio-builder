/** @jest-environment node */
const mockList = jest.fn()
jest.mock('../../common/orders', () => ({ listOrders: (...a) => mockList(...a) }))
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => h }))

import handler from '../../pages/api/admin/print/earnings'

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })

describe('GET /api/admin/print/earnings', () => {
  beforeEach(() => mockList.mockReset())

  it('sums profit across paid orders, excluding pending/canceled', async () => {
    mockList.mockResolvedValue([
      { status: 'shipped', amounts: { profit: 1000, currency: 'USD' } },
      { status: 'placed', amounts: { profit: 500, currency: 'USD' } },
      { status: 'pending', amounts: { profit: 999, currency: 'USD' } },
      { status: 'canceled', amounts: { profit: 999, currency: 'USD' } },
    ])
    const r = res()
    await handler({ method: 'GET' }, r, { id: 'u1' })
    expect(r.json).toHaveBeenCalledWith({ total: 1500, count: 2, currency: 'USD' })
  })

  it('returns zero for no paid orders', async () => {
    mockList.mockResolvedValue([{ status: 'pending', amounts: { profit: 999, currency: 'USD' } }])
    const r = res()
    await handler({ method: 'GET' }, r, { id: 'u1' })
    expect(r.json).toHaveBeenCalledWith({ total: 0, count: 0, currency: 'USD' })
  })

  it('rejects non-GET', async () => {
    const r = res()
    await handler({ method: 'POST' }, r, { id: 'u1' })
    expect(r.status).toHaveBeenCalledWith(405)
  })
})
