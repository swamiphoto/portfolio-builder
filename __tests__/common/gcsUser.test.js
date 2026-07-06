import {
  getUserPrefix,
  getUserSiteConfigPath,
  getUserLibraryConfigPath,
  getUserGalleriesConfigPath,
  getUserPhotoPath,
  getUserPhotosPrefix,
  getUserPrintMasterPath,
  getDomainLookupPath,
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

describe('getUserGalleriesConfigPath', () => {
  it('returns the correct GCS path', () => {
    expect(getUserGalleriesConfigPath('abc123')).toBe('users/abc123/galleries-config.json')
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

describe('getDomainLookupPath', () => {
  it('returns domains/{hostname}.json', () => {
    expect(getDomainLookupPath('photos.janedoe.com')).toBe('domains/photos.janedoe.com.json')
  })
  it('throws when hostname is missing', () => {
    expect(() => getDomainLookupPath('')).toThrow('hostname is required')
  })
})

describe('getUserPrintMasterPath', () => {
  it('returns the print-masters path for a filename', () => {
    expect(getUserPrintMasterPath('abc123', 'hero.jpg')).toBe('users/abc123/photos/print-masters/hero.jpg')
  })
  it('throws if filename is empty', () => {
    expect(() => getUserPrintMasterPath('abc123', '')).toThrow('filename is required')
  })
})

describe('order paths', () => {
  it('builds the orders prefix and a per-order path', () => {
    const { getUserOrdersPrefix, getUserOrderPath } = require('../../common/gcsUser')
    expect(getUserOrdersPrefix('u1')).toBe('users/u1/orders/')
    expect(getUserOrderPath('u1', 'ord_x')).toBe('users/u1/orders/ord_x.json')
  })
  it('throws without an orderId', () => {
    const { getUserOrderPath } = require('../../common/gcsUser')
    expect(() => getUserOrderPath('u1', '')).toThrow('orderId is required')
  })
})
