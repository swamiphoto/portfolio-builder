import { resolveAnalytics } from '@/components/image-displays/SiteAnalytics'

describe('resolveAnalytics', () => {
  it('returns nulls when nothing is configured', () => {
    expect(resolveAnalytics({})).toEqual({ ga: null, plausible: null })
    expect(resolveAnalytics(undefined)).toEqual({ ga: null, plausible: null })
    expect(resolveAnalytics({ googleId: '', plausibleDomain: '' })).toEqual({ ga: null, plausible: null })
  })

  it('accepts valid GA4 / UA / GT ids and trims them', () => {
    expect(resolveAnalytics({ googleId: 'G-ABC123XYZ' }).ga).toBe('G-ABC123XYZ')
    expect(resolveAnalytics({ googleId: '  UA-12345-6 ' }).ga).toBe('UA-12345-6')
    expect(resolveAnalytics({ googleId: 'GT-ABCDEF' }).ga).toBe('GT-ABCDEF')
  })

  it('accepts a plausible domain', () => {
    expect(resolveAnalytics({ plausibleDomain: 'photos.example.com' }).plausible).toBe('photos.example.com')
  })

  it('rejects ids/domains with unsafe characters (script-injection guard)', () => {
    expect(resolveAnalytics({ googleId: "G-X');alert(1)//" }).ga).toBeNull()
    expect(resolveAnalytics({ googleId: 'not-an-id' }).ga).toBeNull()
    expect(resolveAnalytics({ plausibleDomain: 'evil.com" onerror="x' }).plausible).toBeNull()
  })
})
