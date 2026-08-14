import { getBlockSpec } from '@/common/themes'
import { resolveVariant, resolveFont, resolveSize, resolveQuoteStyle } from '@/common/themes/variants'
import { resolveCaptionStyle } from '@/common/captionStyles'

// The theme default a block uses when it hasn't overridden the caption itself.
const capDefault = (type) => resolveCaptionStyle({}, getBlockSpec('kyoto', type)?.defaultCaptionStyle)

describe('kyoto defaults', () => {
  it('single photo defaults to the Centered layout', () => {
    expect(getBlockSpec('kyoto', 'photo').defaultVariant).toBe('centered')
    expect(resolveVariant({ type: 'photo' }, 'kyoto')).toBe('centered')
  })

  it('text blocks default to Medium (subheading)', () => {
    expect(resolveVariant({ type: 'text' }, 'kyoto')).toBe('subheading')
  })

  it('captions default to Serif on photo / photos / video', () => {
    expect(capDefault('photo')).toBe('serif')
    expect(capDefault('photos')).toBe('serif')
    expect(capDefault('video')).toBe('serif')
    // an explicit per-block choice still wins
    expect(resolveCaptionStyle({ captionStyle: 'sans' }, 'serif')).toBe('sans')
  })

  it('testimonials default to Editorial (Fraunces) · Regular · Medium · Photo-above', () => {
    const b = { type: 'testimonial' }
    expect(resolveVariant(b, 'kyoto')).toBe('photo-above')
    expect(resolveSize(b, 'kyoto')).toBe('medium')
    expect(resolveFont(b, 'kyoto')).toContain('Fraunces')
    expect(resolveQuoteStyle(b, 'kyoto')).toBe('regular')
    // explicit choices still win
    expect(resolveQuoteStyle({ type: 'testimonial', quoteStyle: 'italic' }, 'kyoto')).toBe('italic')
  })

  it('other themes are unaffected (manhattan/florence testimonial stays italic)', () => {
    expect(resolveQuoteStyle({ type: 'testimonial' }, 'manhattan')).toBe('italic')
    expect(resolveQuoteStyle({ type: 'testimonial' }, 'florence')).toBe('italic')
  })
})
