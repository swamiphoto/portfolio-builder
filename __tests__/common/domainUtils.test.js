import {
  isApex, dnsRecordsFor, deriveStatus, normalizeCustomDomain, siteUrlFor, parseHost,
} from '../../common/domainUtils'

describe('isApex', () => {
  it('treats a two-label name as apex', () => expect(isApex('janedoe.com')).toBe(true))
  it('treats a three-label name as a subdomain', () => expect(isApex('photos.janedoe.com')).toBe(false))
  it('returns false for empty', () => expect(isApex('')).toBe(false))
})

describe('dnsRecordsFor', () => {
  it('returns an A record for an apex domain', () => {
    expect(dnsRecordsFor('janedoe.com')).toEqual([{ type: 'A', name: '@', value: '76.76.21.21' }])
  })
  it('returns a CNAME for a subdomain using the leftmost label', () => {
    expect(dnsRecordsFor('photos.janedoe.com')).toEqual([{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }])
  })
})

describe('deriveStatus', () => {
  it('is active only when verified and not misconfigured', () => {
    expect(deriveStatus({ verified: true, misconfigured: false })).toBe('active')
  })
  it('is pending when misconfigured', () => {
    expect(deriveStatus({ verified: true, misconfigured: true })).toBe('pending')
  })
  it('is pending when not verified', () => {
    expect(deriveStatus({ verified: false, misconfigured: false })).toBe('pending')
  })
})

describe('normalizeCustomDomain', () => {
  it('returns null for null', () => expect(normalizeCustomDomain(null)).toBeNull())
  it('upgrades a legacy string to the object form', () => {
    expect(normalizeCustomDomain('photos.janedoe.com')).toEqual({
      name: 'photos.janedoe.com', status: 'pending',
      verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
      addedAt: null, verifiedAt: null, lastError: null,
    })
  })
  it('passes through an object, filling defaults', () => {
    expect(normalizeCustomDomain({ name: 'a.com', status: 'active' })).toMatchObject({ name: 'a.com', status: 'active' })
  })
})

describe('siteUrlFor', () => {
  it('uses the custom domain only when active', () => {
    expect(siteUrlFor({ customDomain: { name: 'a.com', status: 'active' } }, 'jane', 'sepia.photo:3000')).toBe('https://a.com')
  })
  it('falls back to the subdomain when the custom domain is pending', () => {
    expect(siteUrlFor({ customDomain: { name: 'a.com', status: 'pending' } }, 'jane', 'sepia.photo')).toBe('https://jane.sepia.photo')
  })
  it('falls back to the subdomain when there is no custom domain', () => {
    expect(siteUrlFor({}, 'jane', 'sepia.photo')).toBe('https://jane.sepia.photo')
  })
})

describe('parseHost', () => {
  it('detects a subdomain of the root', () => {
    expect(parseHost('jane.sepia.photo', 'sepia.photo')).toEqual({ kind: 'subdomain', subdomain: 'jane' })
  })
  it('treats the bare root as root', () => {
    expect(parseHost('sepia.photo', 'sepia.photo')).toEqual({ kind: 'root', subdomain: null })
  })
  it('treats www of the root as root', () => {
    expect(parseHost('www.sepia.photo', 'sepia.photo')).toEqual({ kind: 'root', subdomain: null })
  })
  it('treats an unrelated host as custom', () => {
    expect(parseHost('photos.janedoe.com', 'sepia.photo')).toEqual({ kind: 'custom', subdomain: null })
  })
})
