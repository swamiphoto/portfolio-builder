/** @jest-environment node */
const mockRead = jest.fn()
const mockReadPublished = jest.fn()
jest.mock('../../common/siteConfig', () => ({
  readSiteConfig: (...a) => mockRead(...a),
  readPublishedSiteConfig: (...a) => mockReadPublished(...a),
  writeSiteConfig: jest.fn(),
  createDefaultSiteConfig: jest.fn(() => ({ pages: [], updatedAt: 1 })),
  computeHasUnpublishedChanges: (d, p) => !p || (d?.updatedAt ?? 0) > (p?.publishedAt ?? 0),
}))
jest.mock('../../common/userProfile', () => ({ readUserProfile: jest.fn(() => null) }))
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => h }))

import { handler } from '../../pages/api/admin/site-config'

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })
const USER = { id: 'u1', name: 'X' }

describe('GET /api/admin/site-config', () => {
  beforeEach(() => { mockRead.mockReset(); mockReadPublished.mockReset() })

  it('returns config + hasUnpublishedChanges=false when draft not newer than published', async () => {
    mockRead.mockResolvedValue({ pages: [], updatedAt: 5 })
    mockReadPublished.mockResolvedValue({ pages: [], publishedAt: 5 })
    const r = res()
    await handler({ method: 'GET' }, r, USER)
    const payload = r.json.mock.calls[0][0]
    expect(payload.hasUnpublishedChanges).toBe(false)
    expect(payload.lastPublishedAt).toBe(5)
    expect(payload.config).toEqual({ pages: [], updatedAt: 5 })
  })

  it('returns hasUnpublishedChanges=true when draft is newer', async () => {
    mockRead.mockResolvedValue({ pages: [], updatedAt: 9 })
    mockReadPublished.mockResolvedValue({ pages: [], publishedAt: 5 })
    const r = res()
    await handler({ method: 'GET' }, r, USER)
    expect(r.json.mock.calls[0][0].hasUnpublishedChanges).toBe(true)
  })
})
