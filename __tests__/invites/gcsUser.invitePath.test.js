import { getInviteLookupPath } from '@/common/gcsUser'

describe('getInviteLookupPath', () => {
  it('builds the invites/ key from a normalized code', () => {
    expect(getInviteLookupPath('SEPIA-EARLY')).toBe('invites/SEPIA-EARLY.json')
  })

  it('throws when code is missing', () => {
    expect(() => getInviteLookupPath('')).toThrow(/code is required/)
  })
})
