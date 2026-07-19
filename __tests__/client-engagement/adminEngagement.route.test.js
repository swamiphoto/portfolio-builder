jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))

const mockList = jest.fn()
const mockDownload = jest.fn()
jest.mock('@/common/gcsClient', () => ({
  listFiles: (...a) => mockList(...a),
  downloadJSON: (...a) => mockDownload(...a),
}))

const mockReadSiteConfig = jest.fn()
jest.mock('@/common/siteConfig', () => ({ readSiteConfig: (...a) => mockReadSiteConfig(...a) }))

import handler from '@/pages/api/admin/engagement'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('GET /api/admin/engagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReadSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', title: 'Wedding' }] })
    mockList.mockResolvedValue(['users/u1/client-data/p1.json'])
    mockDownload.mockResolvedValue({
      people: { d1: { name: 'Priya', email: 'p@x.com', firstSeen: 1 } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 10 }],
      comments: [{ id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'love it', ts: 20 }],
      submissions: [{ deviceId: 'd1', ts: 30, count: 1 }],
    })
  })

  it('aggregates events newest-first with page titles and person info', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const { events, pages } = res.json.mock.calls[0][0]
    expect(events.map(e => e.type)).toEqual(['submit', 'comment', 'favorite'])
    expect(events[0]).toMatchObject({ pageTitle: 'Wedding', person: { name: 'Priya', email: 'p@x.com' }, count: 1 })
    expect(events[1].text).toBe('love it')
    expect(pages).toEqual([{ pageId: 'p1', pageTitle: 'Wedding', favoriteCount: 1, commentCount: 1, people: 1 }])
  })

  it('lists the right prefix and 405s non-GET', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(mockList).toHaveBeenCalledWith('users/u1/client-data/')
    const res2 = mockRes()
    await handler({ method: 'POST' }, res2)
    expect(res2.status).toHaveBeenCalledWith(405)
  })
})
