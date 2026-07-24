import { THEMES, THEME_LIST, getTheme, getBlockSpec } from '@/common/themes'
import { kyoto } from '@/common/themes/kyoto'
import { manhattan } from '@/common/themes/manhattan'

const BLOCK_TYPES = ['photo', 'photos', 'text', 'video', 'testimonial', 'page-gallery', 'contact']

describe('theme registry', () => {
  it('registers kyoto and manhattan', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['kyoto', 'manhattan'])
    expect(THEME_LIST.map(t => t.id).sort()).toEqual(['kyoto', 'manhattan'])
  })

  it('getTheme falls back to kyoto for unknown ids', () => {
    expect(getTheme('kyoto')).toBe(kyoto)
    expect(getTheme('manhattan')).toBe(manhattan)
    expect(getTheme('nope')).toBe(kyoto)
    expect(getTheme(undefined)).toBe(kyoto)
  })

  it('every theme+block combo resolves a spec whose default exists in its variants', () => {
    for (const theme of THEME_LIST) {
      for (const type of BLOCK_TYPES) {
        const spec = getBlockSpec(theme.id, type)
        expect(spec).toBeDefined()
        const ids = spec.variants.map(v => v.id)
        expect(ids).toContain(spec.defaultVariant)
      }
    }
  })

  it('getBlockSpec returns the spec or null', () => {
    expect(getBlockSpec('manhattan', 'photo').defaultVariant).toBe('single')
    expect(getBlockSpec('kyoto', 'photo').defaultVariant).toBe('full-bleed')
    expect(getBlockSpec('kyoto', 'bogus')).toBeNull()
  })

  it('manhattan uses the left-rail nav style, kyoto uses cover-embedded', () => {
    expect(manhattan.navStyle).toBe('left-rail')
    expect(kyoto.navStyle).toBe('cover-embedded')
  })
})
