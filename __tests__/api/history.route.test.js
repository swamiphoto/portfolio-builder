/** @jest-environment node */
const mockList = jest.fn()
jest.mock('../../common/gcsClient', () => ({ listFiles: (...a) => mockList(...a) }))
jest.mock('../../common/gcsUser', () => ({ getUserHistoryPrefix: (u) => `users/${u}/history/` }))
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => h }))

import handler from '../../pages/api/admin/history/index'

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })

describe('GET /api/admin/history', () => {
  beforeEach(() => mockList.mockReset())

  it('lists publish snapshots newest first, ignoring autosave subfolder + junk', async () => {
    mockList.mockResolvedValue([
      'users/u1/history/site-config-1000.json',
      'users/u1/history/site-config-3000.json',
      'users/u1/history/site-config-2000.json',
      'users/u1/history/autosave/site-config-500.json',
      'users/u1/history/notes.json',
    ])
    const r = res()
    await handler({ method: 'GET' }, r, { id: 'u1' })
    expect(r.json).toHaveBeenCalledWith({ versions: [{ ts: 3000 }, { ts: 2000 }, { ts: 1000 }] })
  })

  it('returns an empty list when there are no snapshots', async () => {
    mockList.mockResolvedValue([])
    const r = res()
    await handler({ method: 'GET' }, r, { id: 'u1' })
    expect(r.json).toHaveBeenCalledWith({ versions: [] })
  })

  it('rejects non-GET', async () => {
    const r = res()
    await handler({ method: 'POST' }, r, { id: 'u1' })
    expect(r.status).toHaveBeenCalledWith(405)
  })
})
