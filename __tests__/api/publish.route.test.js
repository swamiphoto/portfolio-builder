/** @jest-environment node */
const mockPublish = jest.fn()
jest.mock('../../common/publishConfig', () => ({ publishSiteConfig: (...a) => mockPublish(...a) }))
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => h }))

import { handler } from '../../pages/api/admin/publish'

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })
const USER = { id: 'u1' }

describe('POST /api/admin/publish', () => {
  beforeEach(() => { mockPublish.mockReset(); mockPublish.mockResolvedValue({ publishedAt: 777 }) })

  it('publishes the posted config and returns publishedAt', async () => {
    const r = res()
    await handler({ method: 'POST', body: { pages: [] } }, r, USER)
    expect(mockPublish).toHaveBeenCalledWith('u1', { pages: [] })
    expect(r.status).toHaveBeenCalledWith(200)
    expect(r.json).toHaveBeenCalledWith({ ok: true, publishedAt: 777 })
  })

  it('rejects a config without a pages array', async () => {
    const r = res()
    await handler({ method: 'POST', body: {} }, r, USER)
    expect(r.status).toHaveBeenCalledWith(400)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('rejects non-POST', async () => {
    const r = res()
    await handler({ method: 'GET' }, r, USER)
    expect(r.status).toHaveBeenCalledWith(405)
  })

  it('returns 500 when publishSiteConfig throws', async () => {
    mockPublish.mockRejectedValue(new Error('boom'))
    const r = res()
    await handler({ method: 'POST', body: { pages: [] } }, r, USER)
    expect(r.status).toHaveBeenCalledWith(500)
  })
})
