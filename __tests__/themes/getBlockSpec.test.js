// __tests__/themes/getBlockSpec.test.js
import { getBlockSpec } from '@/common/themes'

describe('getBlockSpec merges base + theme overrides', () => {
  it('kyoto photos inherits all four base layouts, stacked default', () => {
    const spec = getBlockSpec('kyoto', 'photos')
    expect(spec.variants.map(v => v.id)).toEqual(['stacked', 'masonry', 'grid', 'square'])
    expect(spec.defaultVariant).toBe('stacked')
  })

  it('manhattan photo has a single locked variant (no layout choice)', () => {
    const spec = getBlockSpec('manhattan', 'photo')
    expect(spec.variants.map(v => v.id)).toEqual(['single'])
    expect(spec.defaultVariant).toBe('single')
  })

  it('manhattan photos defaults to grid via override', () => {
    expect(getBlockSpec('manhattan', 'photos').defaultVariant).toBe('grid')
  })

  it('kyoto exposes font-family tokens for every slot', () => {
    const { kyoto } = require('@/common/themes')
    expect(kyoto.tokens.fonts.serif).toMatch(/Cormorant/)
    expect(kyoto.tokens.fonts.display).toBe('Muse')
    expect(kyoto.tokens.fonts.mono).toMatch(/Geist Mono/)
  })

  it('returns null for an unknown block type', () => {
    expect(getBlockSpec('kyoto', 'nope')).toBeNull()
  })
})
