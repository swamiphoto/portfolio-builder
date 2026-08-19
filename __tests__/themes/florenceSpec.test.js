import { getTheme, getBlockSpec, THEME_LIST } from '@/common/themes'
import { resolveVariant, resolveFont, resolveAlign } from '@/common/themes/variants'
import { resolveNavStyle } from '@/common/navStyles'

describe('florence theme', () => {
  it('is registered with the expected identity + warm-paper palette', () => {
    const t = getTheme('florence')
    expect(t.id).toBe('florence')
    expect(t.name).toBe('Florence')
    expect(t.navStyle).toBe('left-rail')
    expect(t.tokens['--theme-bg']).toBe('#f4f1ea')
    expect(t.tokens['--theme-text']).toBe('#1c1a17')
    expect(t.tokens['--theme-accent']).toBe('#7d5a44')
  })

  it('appears on the theme picker list (not hidden)', () => {
    expect(THEME_LIST.some(t => t.id === 'florence' && !t.hidden)).toBe(true)
  })

  it('resolves to the shared left-rail nav', () => {
    expect(resolveNavStyle('florence')).toBe('left-rail')
  })

  it('pairs Fraunces (display / gallery name) with IBM Plex Mono (bookish labels)', () => {
    const fonts = getTheme('florence').tokens.fonts
    expect(fonts.display).toContain('Fraunces')
    expect(fonts.mono).toContain('IBM Plex Mono')
    // text is left-aligned like a wall label
    expect(resolveAlign({ type: 'text' }, 'florence')).toBe('left')
  })

  it('single photo offers Full height + Centered (default)', () => {
    const photo = getBlockSpec('florence', 'photo')
    expect(photo.variants.map(v => v.id)).toEqual(['full-height', 'centered'])
    expect(photo.defaultVariant).toBe('centered')
    // A photo with no saved Florence variant (e.g. carried over from another theme)
    // defaults to Centered, not Fill.
    expect(resolveVariant({ type: 'photo' }, 'florence')).toBe('centered')
    // An explicitly-saved variant is preserved.
    expect(resolveVariant({ type: 'photo', themeState: { florence: { variant: 'full-height' } } }, 'florence')).toBe('full-height')
  })

  it('photo sets offer Row (default) + Mosaic, with Size enabled for both', () => {
    const photos = getBlockSpec('florence', 'photos')
    expect(photos.variants.map(v => v.id)).toEqual(['row', 'mosaic'])
    expect(resolveVariant({ type: 'photos' }, 'florence')).toBe('row')
    expect(photos.sizeVariants).toEqual(['row', 'mosaic'])
  })

  it('text defaults to the bookish Mono, with Editorial + Sans offered', () => {
    expect(resolveFont({ type: 'text' }, 'florence')).toContain('IBM Plex Mono')
    const ids = getBlockSpec('florence', 'text').fonts.map(f => f.id)
    expect(ids).toEqual(expect.arrayContaining(['mono', 'fraunces', 'sans']))
  })

  it('does not affect the full-bleed default for provence', () => {
    expect(resolveVariant({ type: 'photo' }, 'provence')).toBe('full-bleed')
  })
})
