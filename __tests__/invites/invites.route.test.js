const mockGetSession = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a) => mockGetSession(...a) }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockIsAdmin = jest.fn()
jest.mock('@/common/platformAdmin', () => ({ isPlatformAdmin: (...a) => mockIsAdmin(...a) }))

const mockCreate = jest.fn()
jest.mock('@/common/invites', () => ({ createInvite: (...a) => mockCreate(...a) }))

const mockList = jest.fn()
const mockDownload = jest.fn()
jest.mock('@/common/gcsClient', () => ({
  listFiles: (...a) => mockList(...a),
  downloadJSON: (...a) => mockDownload(...a),
}))

import handler from '@/pages/api/admin/invites'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ user: { id: 'u1', email: 'owner@sepia.photo' } })
  mockIsAdmin.mockReturnValue(true)
})

it('403s a non-admin', async () => {
  mockIsAdmin.mockReturnValue(false)
  const res = mockRes()
  await handler({ method: 'POST', body: {} }, res)
  expect(res.status).toHaveBeenCalledWith(403)
  expect(mockCreate).not.toHaveBeenCalled()
})

it('POST creates an invite → 201', async () => {
  mockCreate.mockResolvedValue({ code: 'SEPIA-EARLY', trialDays: 60 })
  const res = mockRes()
  await handler({ method: 'POST', body: { label: 'Batch 1', maxUses: 10 } }, res)
  expect(mockCreate).toHaveBeenCalledWith({ label: 'Batch 1', maxUses: 10, expiresAt: undefined, trialDays: undefined, code: undefined })
  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith({ invite: { code: 'SEPIA-EARLY', trialDays: 60 } })
})

it('GET lists all invites → 200', async () => {
  mockList.mockResolvedValue(['invites/SEPIA-EARLY.json', 'invites/ONE.json'])
  mockDownload.mockImplementation((k) => Promise.resolve({ code: k.includes('ONE') ? 'ONE' : 'SEPIA-EARLY' }))
  const res = mockRes()
  await handler({ method: 'GET' }, res)
  expect(res.status).toHaveBeenCalledWith(200)
  const body = res.json.mock.calls[0][0]
  expect(body.invites.map((i) => i.code).sort()).toEqual(['ONE', 'SEPIA-EARLY'])
})

it('405s other methods', async () => {
  const res = mockRes()
  await handler({ method: 'DELETE' }, res)
  expect(res.status).toHaveBeenCalledWith(405)
})
