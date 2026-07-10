jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))
jest.mock('@/common/gcsClient', () => ({
  listFilesWithEtags: (...a) => mockList(...a),
  PUBLIC_URL: 'https://cdn.test',
}))
jest.mock('@/common/gcsUser', () => ({ getUserPhotosPrefix: (id) => `users/${id}/photos/` }))

const mockList = jest.fn()
import handler from '@/pages/api/admin/dedup/storage-hashes'

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })

describe('GET /api/admin/dedup/storage-hashes', () => {
  beforeEach(() => mockList.mockReset())

  it('returns { hashes: { publicUrl: etag } } from the object listing', async () => {
    mockList.mockResolvedValue([
      { key: 'users/u1/photos/import/a.jpg', etag: 'e1', size: 10 },
      { key: 'users/u1/photos/import/b.jpg', etag: 'e2', size: 20 },
      { key: 'users/u1/photos/import/noetag.jpg', etag: '', size: 0 },
    ])
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(mockList).toHaveBeenCalledWith('users/u1/photos/')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json.mock.calls[0][0].hashes).toEqual({
      'https://cdn.test/users/u1/photos/import/a.jpg': 'e1',
      'https://cdn.test/users/u1/photos/import/b.jpg': 'e2',
    })
  })

  it('405 on non-GET', async () => {
    const res = mockRes()
    await handler({ method: 'POST' }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
