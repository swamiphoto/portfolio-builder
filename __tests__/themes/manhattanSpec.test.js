import { getBlockSpec, getTheme } from '../../common/themes'

describe('manhattan theme spec', () => {
  it('exposes a terracotta accent token', () => {
    expect(getTheme('manhattan').tokens['--theme-accent']).toBe('#b5502e')
  })

  it('locks single photo to one no-choice variant', () => {
    const spec = getBlockSpec('manhattan', 'photo')
    expect(spec.variants.map(v => v.id)).toEqual(['single'])
    expect(spec.defaultVariant).toBe('single')
  })

  it('offers only left alignment for text and contact', () => {
    expect(getBlockSpec('manhattan', 'text').aligns).toEqual(['left'])
    expect(getBlockSpec('manhattan', 'text').defaultAlign).toBe('left')
    expect(getBlockSpec('manhattan', 'contact').aligns).toEqual(['left'])
    expect(getBlockSpec('manhattan', 'contact').defaultAlign).toBe('left')
  })

  it('drops full-bleed from manhattan video', () => {
    const ids = getBlockSpec('manhattan', 'video').variants.map(v => v.id)
    expect(ids).not.toContain('full-bleed')
    expect(getBlockSpec('manhattan', 'video').defaultVariant).toBe('centered')
  })

  it('leaves kyoto photo variants untouched', () => {
    const ids = getBlockSpec('kyoto', 'photo').variants.map(v => v.id)
    expect(ids).toEqual(['full-bleed', 'centered', 'side-by-side'])
  })
})
