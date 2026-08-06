import { getTheme, getBlockSpec } from '@/common/themes'
import { resolveVariant, resolveFont } from '@/common/themes/variants'

describe('provence theme', () => {
  it('is registered with the expected identity + palette', () => {
    const t = getTheme('provence')
    expect(t.id).toBe('provence')
    expect(t.name).toBe('Provence')
    expect(t.navStyle).toBe('split-cover')
    expect(t.tokens['--theme-bg']).toBe('#f7f3ea')
    expect(t.tokens['--theme-accent']).toBe('#b0925f')
  })

  it('pairs Spectral (body) with Cormorant Garamond (display) — distinct from Kyoto', () => {
    const fonts = getTheme('provence').tokens.fonts
    expect(fonts.serif).toContain('Spectral')
    expect(fonts.display).toContain('Cormorant')
    // text blocks default to the serif slot → Spectral
    expect(resolveFont({ type: 'text' }, 'provence')).toContain('Spectral')
    // and it is not Kyoto's serif
    expect(getTheme('kyoto').tokens.fonts.serif).not.toContain('Spectral')
  })

  it('defaults photo sets to justified rows (grid) but keeps every layout', () => {
    expect(resolveVariant({ type: 'photos' }, 'provence')).toBe('grid')
    const ids = getBlockSpec('provence', 'photos').variants.map(v => v.id)
    expect(ids).toEqual(expect.arrayContaining(['stacked', 'masonry', 'grid', 'square']))
  })

  it('keeps the single-photo layout choices Manhattan removes', () => {
    const ids = getBlockSpec('provence', 'photo').variants.map(v => v.id)
    expect(ids).toEqual(expect.arrayContaining(['full-bleed', 'centered', 'side-by-side']))
    expect(getBlockSpec('provence', 'photo').defaultVariant).toBe('full-bleed')
  })
})
