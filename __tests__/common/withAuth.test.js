// Mock the nextauth config file FIRST (before any imports)
jest.mock('../../pages/api/auth/[...nextauth]', () => ({
  authOptions: { providers: [] },
}))

// Mock next-auth/next BEFORE importing withAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

import { withAuth } from '../../common/withAuth'
import { getServerSession } from 'next-auth/next'

function makeReqRes() {
  const req = { method: 'GET', headers: {} }
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  }
  return { req, res }
}

describe('withAuth', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => jest.clearAllMocks())

  it('calls handler with session user when authenticated', async () => {
    const session = { user: { id: 'user-123', email: 'test@example.com', name: 'Test User' } }
    getServerSession.mockResolvedValue(session)

    const handler = jest.fn()
    const { req, res } = makeReqRes()

    await withAuth(handler)(req, res)

    expect(getServerSession).toHaveBeenCalledWith(req, res, { providers: [] })
    expect(handler).toHaveBeenCalledWith(req, res, session.user)
  })

  it('returns 401 when not authenticated', async () => {
    getServerSession.mockResolvedValue(null)

    const handler = jest.fn()
    const { req, res } = makeReqRes()

    await withAuth(handler)(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 500 if getServerSession throws', async () => {
    getServerSession.mockRejectedValue(new Error('auth service down'))

    const handler = jest.fn()
    const { req, res } = makeReqRes()

    await withAuth(handler)(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    expect(handler).not.toHaveBeenCalled()
  })
})
