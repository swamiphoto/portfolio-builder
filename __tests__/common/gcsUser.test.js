import {
  getUserPrefix,
  getUserSiteConfigPath,
  getUserLibraryConfigPath,
  getUserPhotoPath,
  getUserPhotosPrefix,
} from '../../common/gcsUser'

describe('getUserPrefix', () => {
  it('returns users/{userId}/', () => {
    expect(getUserPrefix('abc123')).toBe('users/abc123/')
  })

  it('throws if userId is empty', () => {
    expect(() => getUserPrefix('')).toThrow('userId is required')
  })

  it('throws if userId is undefined', () => {
    expect(() => getUserPrefix(undefined)).toThrow('userId is required')
  })
})

describe('getUserSiteConfigPath', () => {
  it('returns the correct GCS path', () => {
    expect(getUserSiteConfigPath('abc123')).toBe('users/abc123/site-config.json')
  })
})

describe('getUserLibraryConfigPath', () => {
  it('returns the correct GCS path', () => {
    expect(getUserLibraryConfigPath('abc123')).toBe('users/abc123/library-config.json')
  })
})

describe('getUserPhotosPrefix', () => {
  it('returns the photos folder prefix', () => {
    expect(getUserPhotosPrefix('abc123')).toBe('users/abc123/photos/')
  })
})

describe('getUserPhotoPath', () => {
  it('returns the correct GCS path for a filename', () => {
    expect(getUserPhotoPath('abc123', 'hero.jpg')).toBe('users/abc123/photos/hero.jpg')
  })

  it('throws if filename is empty', () => {
    expect(() => getUserPhotoPath('abc123', '')).toThrow('filename is required')
  })
})
