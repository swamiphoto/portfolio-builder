import {
  resolveNavMode, resolveSubNavStyle, resolveFooter,
  logoFontStyle, socialHref, SOCIAL_KEYS,
} from '@/common/siteDesign'

describe('resolveNavMode', () => {
  it('returns menu only when explicitly menu', () => {
    expect(resolveNavMode({ navStyle: 'menu' })).toBe('menu')
  })
  it('normalizes legacy/unknown values to links', () => {
    expect(resolveNavMode({ navStyle: 'minimal' })).toBe('links')
    expect(resolveNavMode({ navStyle: 'centered' })).toBe('links')
    expect(resolveNavMode({})).toBe('links')
    expect(resolveNavMode(undefined)).toBe('links')
  })
})

describe('resolveSubNavStyle', () => {
  it('returns inline only when explicitly inline, else dropdown', () => {
    expect(resolveSubNavStyle({ subNavStyle: 'inline' })).toBe('inline')
    expect(resolveSubNavStyle({ subNavStyle: 'dropdown' })).toBe('dropdown')
    expect(resolveSubNavStyle({})).toBe('dropdown')
    expect(resolveSubNavStyle(undefined)).toBe('dropdown')
  })
})

describe('resolveFooter', () => {
  it('returns the layout string; expanded only when explicit, else simple', () => {
    expect(resolveFooter({ design: { footerLayout: 'expanded' } })).toBe('expanded')
    expect(resolveFooter({ design: { footerLayout: 'standard' } })).toBe('simple')
    expect(resolveFooter({ design: { footerLayout: 'none' } })).toBe('simple')
    expect(resolveFooter({})).toBe('simple')
    expect(resolveFooter(undefined)).toBe('simple')
  })
})

describe('logoFontStyle', () => {
  it('returns Muse serif for theme, null for undefined', () => {
    expect(logoFontStyle('theme')).toEqual({ fontFamily: '"Muse", Georgia, serif', textTransform: 'none', letterSpacing: '0.05em' })
    expect(logoFontStyle(undefined)).toBeNull()
  })
  it('returns Inter uppercase for modern', () => {
    const s = logoFontStyle('modern')
    expect(s.fontFamily).toMatch(/Inter/)
    expect(s.textTransform).toBe('uppercase')
  })
  it('returns Fraunces non-uppercase for editorial', () => {
    const s = logoFontStyle('editorial')
    expect(s.fontFamily).toMatch(/Fraunces/)
    expect(s.textTransform).toBe('none')
  })
})

describe('socialHref', () => {
  it('passes through absolute urls', () => {
    expect(socialHref('instagram', 'https://instagram.com/x')).toBe('https://instagram.com/x')
  })
  it('builds a handle url and strips @', () => {
    expect(socialHref('instagram', '@ansel')).toBe('https://instagram.com/ansel')
  })
  it('builds website with https prefix', () => {
    expect(socialHref('website', 'ansel.com')).toBe('https://ansel.com')
  })
  it('returns null for empty values', () => {
    expect(socialHref('instagram', '')).toBeNull()
  })
  it('SOCIAL_KEYS lists the six social platforms', () => {
    expect(SOCIAL_KEYS).toEqual(['instagram','facebook','twitter','tiktok','youtube','website'])
  })
})
