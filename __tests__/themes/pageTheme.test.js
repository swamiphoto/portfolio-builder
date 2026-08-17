import { resolvePageThemeId, getPageTheme } from '@/common/themes'

describe('per-page theme override', () => {
  const site = { design: { theme: 'amsterdam' } }

  it('falls back to the site theme when the page has no override', () => {
    expect(resolvePageThemeId(site, { id: 'p' })).toBe('amsterdam')
    expect(resolvePageThemeId(site, { themeOverride: null })).toBe('amsterdam')
    expect(getPageTheme(site, {}).id).toBe('amsterdam')
  })

  it('renders the page in its override theme when set to a real theme', () => {
    expect(resolvePageThemeId(site, { themeOverride: 'florence' })).toBe('florence')
    expect(getPageTheme(site, { themeOverride: 'florence' }).id).toBe('florence')
  })

  it('ignores an unknown override id (guards against stale/removed themes)', () => {
    expect(resolvePageThemeId(site, { themeOverride: 'nope' })).toBe('amsterdam')
  })

  it('defaults to kyoto when neither site theme nor override is set', () => {
    expect(resolvePageThemeId({}, {})).toBe('kyoto')
    expect(resolvePageThemeId(undefined, undefined)).toBe('kyoto')
  })
})
