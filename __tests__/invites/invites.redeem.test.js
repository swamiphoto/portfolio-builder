const mockDownload = jest.fn()
const mockUpload = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/gcsClient', () => ({
  downloadJSON: (...a) => mockDownload(...a),
  uploadJSON: (...a) => mockUpload(...a),
}))

import { redeemInvite, InviteError } from '@/common/invites'
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
  await expect(redeemInvite('nope', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.NOT_FOUND })
})

it('throws EXPIRED when past expiresAt', async () => {
  mockDownload.mockResolvedValue(invite({ expiresAt: '2000-01-01T00:00:00.000Z' }))
  await expect(redeemInvite('SEPIA-EARLY', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.EXPIRED })
})

it('throws EXHAUSTED when uses >= maxUses', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 1, uses: 1 }))
  await expect(redeemInvite('SEPIA-EARLY', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.EXHAUSTED })
})

it('redeems: increments uses, records the user, returns trialDays', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 5, uses: 2 }))
  const result = await redeemInvite('sepia-early', 'u1')
  expect(result).toEqual({ code: 'SEPIA-EARLY', trialDays: 60 })
  const written = mockUpload.mock.calls[0][1]
  expect(written.uses).toBe(3)
  expect(written.redeemedBy).toHaveLength(1)
  expect(written.redeemedBy[0].userId).toBe('u1')
  expect(typeof written.redeemedBy[0].at).toBe('string')
})

it('is idempotent for the same user (no double count)', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 1, uses: 1, redeemedBy: [{ userId: 'u1', at: 't' }] }))
  const result = await redeemInvite('SEPIA-EARLY', 'u1')
  expect(result).toEqual({ code: 'SEPIA-EARLY', trialDays: 60 })
  // Already redeemed by u1 → allowed even though exhausted, and uses not bumped again
  if (mockUpload.mock.calls.length) {
    expect(mockUpload.mock.calls[0][1].uses).toBe(1)
  }
})

it('InviteError carries a code', () => {
  const e = new InviteError(INVITE_ERRORS.NOT_FOUND, 'nope')
  expect(e).toBeInstanceOf(Error)
  expect(e.code).toBe(INVITE_ERRORS.NOT_FOUND)
})
