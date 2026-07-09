import { customDomainName } from '@/common/customDomainName'

describe('customDomainName', () => {
  it('returns a legacy string domain unchanged', () => {
    expect(customDomainName('photos.example.com')).toBe('photos.example.com')
  })

  it('reads .name from the object shape written by the domain-connection flow', () => {
    const obj = {
      name: 'photos.example.com',
      status: 'active',
      verification: [],
      addedAt: '2026-01-01T00:00:00Z',
      verifiedAt: '2026-01-02T00:00:00Z',
      lastError: null,
    }
    expect(customDomainName(obj)).toBe('photos.example.com')
  })

  it('returns empty string for null, undefined, or an object with no name', () => {
    expect(customDomainName(null)).toBe('')
    expect(customDomainName(undefined)).toBe('')
    expect(customDomainName({ status: 'pending' })).toBe('')
  })
})
