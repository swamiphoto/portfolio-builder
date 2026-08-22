import { blantyre } from '@/common/themes/blantyre'
import { getBlockSpec } from '@/common/themes'
import { resolveVariant, resolveFont, resolveAlign, resolvePhotoSize } from '@/common/themes/variants'
import { resolveNavStyle } from '@/common/navStyles'
import { resolveCaptionStyle, captionStyleCss, CAPTION_STYLE_OPTIONS } from '@/common/captionStyles'

describe('blantyre theme', () => {
  it('registers the top-header nav style', () => {
    expect(blantyre.navStyle).toBe('top-header')
    expect(resolveNavStyle('blantyre')).toBe('top-header')
  })

  it('photos default to the offset scatter, with every base layout still offered', () => {
    const spec = getBlockSpec('blantyre', 'photos')
    expect(spec.defaultVariant).toBe('offset')
    const ids = spec.variants.map(v => v.id)
    expect(ids).toEqual(expect.arrayContaining(['offset', 'stacked', 'masonry', 'grid', 'square']))
    expect(spec.sizeVariants).toContain('offset')
  })

  it('a bare photos block resolves to offset in blantyre but not elsewhere', () => {
    expect(resolveVariant({ type: 'photos' }, 'blantyre')).toBe('offset')
    // Another theme never resolves the blantyre-only id, even if stored.
    expect(resolveVariant({ type: 'photos', themeState: { kyoto: { variant: 'offset' } } }, 'kyoto')).toBe('stacked')
  })

  it('offset honors the L/M/S size control', () => {
    expect(resolvePhotoSize({ type: 'photos' }, 'blantyre')).toBe('large')
    expect(resolvePhotoSize({ type: 'photos', size: 'small' }, 'blantyre')).toBe('small')
  })

  it('captions default to the mono style with an upright typewriter css', () => {
    const spec = getBlockSpec('blantyre', 'photo')
    expect(spec.defaultCaptionStyle).toBe('mono')
    expect(resolveCaptionStyle({}, spec.defaultCaptionStyle)).toBe('mono')
    expect(CAPTION_STYLE_OPTIONS.map(o => o.id)).toContain('mono')
    const css = captionStyleCss('mono')
    expect(css.fontFamily).toMatch(/Roboto Mono/)
    expect(css.fontStyle).toBe('normal')
  })

  it('text speaks mono by default and can switch to the Marcellus display voice', () => {
    expect(resolveAlign({ type: 'text' }, 'blantyre')).toBe('left')
    expect(resolveFont({ type: 'text' }, 'blantyre')).toMatch(/Roboto Mono/)
    expect(resolveFont({ type: 'text', font: 'display' }, 'blantyre')).toMatch(/Marcellus/)
  })
})
