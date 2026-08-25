import { INVITE_ERRORS, inviteErrorMessage } from '@/common/inviteMessages'

describe('inviteMessages', () => {
  it('exposes the four error codes', () => {
    expect(INVITE_ERRORS).toEqual({
      REQUIRED: 'INVITE_REQUIRED',
      NOT_FOUND: 'INVITE_NOT_FOUND',
      EXPIRED: 'INVITE_EXPIRED',
      EXHAUSTED: 'INVITE_EXHAUSTED',
    })
  })

  it('maps each code to a distinct, non-empty message', () => {
    const msgs = Object.values(INVITE_ERRORS).map(inviteErrorMessage)
    msgs.forEach((m) => expect(typeof m === 'string' && m.length > 0).toBe(true))
    expect(new Set(msgs).size).toBe(msgs.length)
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(inviteErrorMessage('WAT')).toMatch(/invite/i)
  })
})
