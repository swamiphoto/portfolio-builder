import { getBlockSpec } from '@/common/themes'
import { resolveVariant, resolveFont, resolveFontWeight, resolveSize, resolveQuoteStyle } from '@/common/themes/variants'
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

  it('testimonials default to Bold Cormorant (weight 600) · Regular · Medium · Photo-above', () => {
    const b = { type: 'testimonial' }
    expect(resolveVariant(b, 'kyoto')).toBe('photo-above')
    expect(resolveSize(b, 'kyoto')).toBe('medium')
    expect(resolveFont(b, 'kyoto')).toContain('Cormorant')
    expect(resolveFontWeight(b, 'kyoto')).toBe(600)
    expect(resolveQuoteStyle(b, 'kyoto')).toBe('regular')
    // explicit choices still win
    expect(resolveQuoteStyle({ type: 'testimonial', quoteStyle: 'italic' }, 'kyoto')).toBe('italic')
  })

  it('offers three type voices — Serif, Editorial (Cormorant 600), Mono — no Fraunces', () => {
    for (const type of ['text', 'testimonial']) {
      const ids = getBlockSpec('kyoto', type).fonts.map((f) => f.id)
      expect(ids).toEqual(['serif', 'serifBold', 'mono'])
      expect(ids).not.toContain('fraunces')
    }
    // Editorial reuses the Cormorant family, just heavier
    expect(resolveFont({ type: 'text', font: 'serifBold' }, 'kyoto')).toContain('Cormorant')
    expect(resolveFontWeight({ type: 'text', font: 'serifBold' }, 'kyoto')).toBe(600)
    // Mono matches the caption/label mono stack (Roboto Mono) so a Mono text
    // block and a Mono caption never diverge; Serif/Mono force no weight.
    expect(resolveFont({ type: 'text', font: 'mono' }, 'kyoto')).toContain('Roboto Mono')
    expect(resolveFontWeight({ type: 'text', font: 'serif' }, 'kyoto')).toBeUndefined()
    expect(resolveFontWeight({ type: 'text', font: 'mono' }, 'kyoto')).toBeUndefined()
    // a block that stored the retired Fraunces slot falls back to the Serif default
    expect(resolveFont({ type: 'text', font: 'fraunces' }, 'kyoto')).toContain('Cormorant')
  })

  it('other themes are unaffected (manhattan/florence testimonial stays italic)', () => {
    expect(resolveQuoteStyle({ type: 'testimonial' }, 'manhattan')).toBe('italic')
    expect(resolveQuoteStyle({ type: 'testimonial' }, 'florence')).toBe('italic')
  })
})
