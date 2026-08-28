const mockDownload = jest.fn()
const mockUpload = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/gcsClient', () => ({
  downloadJSON: (...a) => mockDownload(...a),
  uploadJSON: (...a) => mockUpload(...a),
}))

import { checkInvite } from '@/common/invites'
import { INVITE_ERRORS } from '@/common/inviteMessages'

function invite(overrides = {}) {
  return { code: 'SEPIA-EARLY', label: '', createdAt: 't', maxUses: null, uses: 0, redeemedBy: [], expiresAt: null, trialDays: 60, ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpload.mockResolvedValue(undefined)
})

it('throws NOT_FOUND for a missing code', async () => {
  mockDownload.mockRejectedValue({ name: 'NoSuchKey' })
  await expect(checkInvite('nope', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.NOT_FOUND })
})

it('throws NOT_FOUND for a code that normalizes to empty, without a download', async () => {
  await expect(checkInvite('!!!', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.NOT_FOUND })
  expect(mockDownload).not.toHaveBeenCalled()
})

it('throws EXPIRED when past expiresAt', async () => {
  mockDownload.mockResolvedValue(invite({ expiresAt: '2000-01-01T00:00:00.000Z' }))
  await expect(checkInvite('SEPIA-EARLY', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.EXPIRED })
})

it('throws EXHAUSTED when uses >= maxUses', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 1, uses: 1 }))
  await expect(checkInvite('SEPIA-EARLY', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.EXHAUSTED })
})

it('accepts a valid code WITHOUT redeeming it (no write, no use bump)', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 5, uses: 2 }))
  const result = await checkInvite('sepia-early', 'u1')
  expect(result).toEqual({ code: 'SEPIA-EARLY' })
  expect(mockUpload).not.toHaveBeenCalled()
})

it('accepts a code this user already redeemed, even if otherwise exhausted or expired', async () => {
  // A refresh mid-onboarding must not lock the user out at the gate.
  mockDownload.mockResolvedValue(invite({
    maxUses: 1, uses: 1, expiresAt: '2000-01-01T00:00:00.000Z',
    redeemedBy: [{ userId: 'u1', at: 't' }],
  }))
  await expect(checkInvite('SEPIA-EARLY', 'u1')).resolves.toEqual({ code: 'SEPIA-EARLY' })
  expect(mockUpload).not.toHaveBeenCalled()
})
