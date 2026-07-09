import { detectProvider, registrableDomain } from '../../common/dnsProviders'

describe('detectProvider', () => {
  it('maps domaincontrol.com nameservers to GoDaddy with a deep link', () => {
    const p = detectProvider(['ns31.domaincontrol.com', 'ns32.domaincontrol.com'], 'swami108.com')
    expect(p).toMatchObject({ id: 'godaddy', name: 'GoDaddy' })
    expect(p.dnsUrl).toContain('swami108.com')
  })
  it('maps registrar-servers.com to Namecheap', () => {
    expect(detectProvider(['dns1.registrar-servers.com'], 'sepia.so')).toMatchObject({ id: 'namecheap', name: 'Namecheap' })
  })
  it('maps awsdns to Route 53', () => {
    expect(detectProvider(['ns-1.awsdns-01.org'], 'x.com').id).toBe('route53')
  })
  it('is case-insensitive', () => {
    expect(detectProvider(['NS1.CLOUDFLARE.COM'], 'x.com').id).toBe('cloudflare')
  })
  it('returns unknown for an unrecognized provider', () => {
    expect(detectProvider(['ns1.some-random-host.net'], 'x.com')).toEqual({ id: 'unknown', name: null, dnsUrl: null })
  })
  it('handles empty nameservers', () => {
    expect(detectProvider([], 'x.com').id).toBe('unknown')
  })
})

describe('registrableDomain', () => {
  it('returns a two-label domain unchanged', () => expect(registrableDomain('swami108.com')).toBe('swami108.com'))
  it('strips a subdomain to the apex', () => expect(registrableDomain('photos.janedoe.com')).toBe('janedoe.com'))
})
