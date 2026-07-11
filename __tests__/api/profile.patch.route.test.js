jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1', name: 'Ann', email: 'a@x.co' }),
}))

const mockRead = jest.fn()
const mockWrite = jest.fn().mockResolvedValue()
jest.mock('@/common/userProfile', () => ({
  readUserProfile: (...a) => mockRead(...a),
  writeUserProfile: (...a) => mockWrite(...a),
  claimUsername: jest.fn(),
  lookupUserByUsername: jest.fn(),
}))

import handler from '@/pages/api/admin/profile'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('PATCH /api/admin/profile', () => {
  beforeEach(() => { mockRead.mockReset(); mockWrite.mockClear() })

  it('deep-merges onboarding flags without clobbering username or existing flags', async () => {
    mockRead.mockResolvedValue({ userId: 'u1', username: 'ann', onboarding: { welcomed: true } })
    const res = mockRes()
    await handler({ method: 'PATCH', body: { onboarding: { tourDone: true } } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const saved = mockWrite.mock.calls[0][1]
    expect(saved.username).toBe('ann')
    expect(saved.onboarding).toEqual({ welcomed: true, tourDone: true })
  })

  it('returns 404 when no profile exists yet', async () => {
    mockRead.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'PATCH', body: { onboarding: { tourDone: true } } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(mockWrite).not.toHaveBeenCalled()
  })
})
