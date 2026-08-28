const mockGetSession = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a) => mockGetSession(...a) }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockReadProfile = jest.fn()
const mockWriteProfile = jest.fn().mockResolvedValue(undefined)
const mockClaim = jest.fn().mockResolvedValue('taken-slug')
const mockLookup = jest.fn()
jest.mock('@/common/userProfile', () => ({
  readUserProfile: (...a) => mockReadProfile(...a),
  writeUserProfile: (...a) => mockWriteProfile(...a),
  claimUsername: (...a) => mockClaim(...a),
  lookupUserByUsername: (...a) => mockLookup(...a),
}))

const mockRedeem = jest.fn()
jest.mock('@/common/invites', () => {
  const actual = jest.requireActual('@/common/invites')
  return { ...actual, redeemInvite: (...a) => mockRedeem(...a) }
})

import handler from '@/pages/api/admin/profile'
import { INVITE_ERRORS } from '@/common/inviteMessages'
import { InviteError } from '@/common/invites'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}
const USER = { id: 'u1', email: 'a@b.com', name: 'Ann' }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ user: USER })
  mockLookup.mockResolvedValue(null)
  mockClaim.mockResolvedValue('ann')
})

it('new tenant without a code → 400 INVITE_REQUIRED', async () => {
  mockReadProfile.mockResolvedValue(null)
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann' } }, res)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({ error: INVITE_ERRORS.REQUIRED })
  expect(mockWriteProfile).not.toHaveBeenCalled()
})

it('new tenant with an invalid code → 403 with the error code', async () => {
  mockReadProfile.mockResolvedValue(null)
  mockRedeem.mockRejectedValue(new InviteError(INVITE_ERRORS.NOT_FOUND))
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann', inviteCode: 'nope' } }, res)
  expect(res.status).toHaveBeenCalledWith(403)
  expect(res.json).toHaveBeenCalledWith({ error: INVITE_ERRORS.NOT_FOUND })
  expect(mockWriteProfile).not.toHaveBeenCalled()
})

it('new tenant with a valid code → 200, stamps trialEndsAt + invite', async () => {
  mockReadProfile.mockResolvedValue(null)
  mockRedeem.mockResolvedValue({ code: 'SEPIA-EARLY', trialDays: 60 })
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann', inviteCode: 'sepia-early' } }, res)
  expect(mockRedeem).toHaveBeenCalledWith('sepia-early', 'u1')
  expect(res.status).toHaveBeenCalledWith(200)
  const profile = res.json.mock.calls[0][0]
  expect(profile.username).toBe('ann')
  expect(profile.invite).toEqual({ code: 'SEPIA-EARLY', redeemedAt: expect.any(String) })
  const days = (Date.parse(profile.trialEndsAt) - Date.now()) / 86400000
  expect(days).toBeGreaterThan(59)
  expect(days).toBeLessThan(61)
  expect(mockWriteProfile).toHaveBeenCalled()
  expect(mockClaim).toHaveBeenCalledWith('u1', 'ann')
})

it('existing tenant is grandfathered — no code needed, trial preserved', async () => {
  mockReadProfile.mockResolvedValue({ userId: 'u1', username: 'ann', createdAt: 'orig', trialEndsAt: '2099-01-01T00:00:00.000Z', invite: { code: 'OLD', redeemedAt: 't' } })
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann' } }, res)
  expect(mockRedeem).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledWith(200)
  const profile = res.json.mock.calls[0][0]
  expect(profile.trialEndsAt).toBe('2099-01-01T00:00:00.000Z')
  expect(profile.invite).toEqual({ code: 'OLD', redeemedAt: 't' })
})

it('username taken → 409 before any redemption', async () => {
  mockReadProfile.mockResolvedValue(null)
  mockLookup.mockResolvedValue({ userId: 'someone-else' })
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann', inviteCode: 'sepia-early' } }, res)
  expect(res.status).toHaveBeenCalledWith(409)
  expect(mockRedeem).not.toHaveBeenCalled()
})
