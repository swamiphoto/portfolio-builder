import {
  getUserProfilePath,
  getUsernameLookupPath,
} from '../../common/userProfile'

describe('getUserProfilePath', () => {
  it('returns the correct R2 path', () => {
    expect(getUserProfilePath('user123')).toBe('users/user123/profile.json')
  })
  it('throws when userId is missing', () => {
    expect(() => getUserProfilePath('')).toThrow('userId is required')
  })
})

describe('getUsernameLookupPath', () => {
  it('returns the correct R2 path', () => {
    expect(getUsernameLookupPath('swamiphoto')).toBe('usernames/swamiphoto.json')
  })
  it('throws when username is missing', () => {
    expect(() => getUsernameLookupPath('')).toThrow('username is required')
  })
})
