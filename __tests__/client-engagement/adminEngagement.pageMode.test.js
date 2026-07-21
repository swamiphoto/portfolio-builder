jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))

const mockDownload = jest.fn()
jest.mock('@/common/gcsClient', () => ({
  listFiles: jest.fn(),
  downloadJSON: (...a) => mockDownload(...a),
}))
jest.mock('@/common/siteConfig', () => ({ readSiteConfig: jest.fn() }))

import handler from '@/pages/api/admin/engagement'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDownload.mockResolvedValue({
    people: { d1: { name: 'Priya', email: 'p@x.com' } },
    favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 10 }],
    comments: [{ id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'love it', ts: 20 }],
    submissions: [],
  })
})

it('returns a per-photo map for a pageId, names only (no emails)', async () => {
  const res = mockRes()
  await handler({ method: 'GET', query: { pageId: 'p1' } }, res)
  expect(mockDownload).toHaveBeenCalledWith('users/u1/client-data/p1.json')
  const body = res.json.mock.calls[0][0]
  expect(body.pageId).toBe('p1')
  expect(body.hasFeedback).toBe(true)
  expect(body.lastActivityTs).toBe(20)
  expect(body.byPhoto['https://cdn/a.jpg']).toMatchObject({ favCount: 1, favBy: ['Priya'], commentCount: 1 })
  expect(JSON.stringify(body)).not.toContain('p@x.com')
})

it('returns empty shape when the page file is missing', async () => {
  mockDownload.mockRejectedValue(new Error('not found'))
  const res = mockRes()
  await handler({ method: 'GET', query: { pageId: 'nope' } }, res)
  expect(res.json.mock.calls[0][0]).toEqual({ pageId: 'nope', byPhoto: {}, lastActivityTs: 0, hasFeedback: false })
})
