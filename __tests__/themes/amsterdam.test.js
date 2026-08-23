import { getBlockSpec } from '@/common/themes'
import { amsterdam, AMSTERDAM_INKS, resolveAmsterdamInk, amsterdamInkColors } from '@/common/themes/amsterdam'

describe('amsterdam theme', () => {
  it('is a left-rail theme with the poster palette', () => {
    expect(amsterdam.id).toBe('amsterdam')
    expect(amsterdam.navStyle).toBe('left-rail')
    expect(amsterdam.tokens['--theme-bg']).toBe('#f6efe4')
    expect(amsterdam.tokens.fonts.display).toContain('Fraunces')
    expect(amsterdam.tokens.fonts.serif).toContain('Playfair Display')
    // Condensed was retired from the picker but still resolves to the new display face.
    expect(amsterdam.tokens.fonts.condensed).toContain('Fraunces')
  })

  it('photo defaults to full-height Fill; photos to Row (+Mosaic)', () => {
    const photo = getBlockSpec('amsterdam', 'photo')
    expect(photo.defaultVariant).toBe('full-height')
    expect(photo.variants.map(v => v.id).sort()).toEqual(['centered', 'full-height'])
    const photos = getBlockSpec('amsterdam', 'photos')
    expect(photos.defaultVariant).toBe('row')
    expect(photos.variants.map(v => v.id).sort()).toEqual(['mosaic', 'row'])
  })

  it('text keeps the L/M/S size variants and defaults to the readable Editorial font', () => {
    const text = getBlockSpec('amsterdam', 'text')
    expect(text.variants.map(v => v.id)).toEqual(['heading', 'subheading', 'body'])
    expect(text.defaultFont).toBe('serif')
    expect(text.fonts.map(f => f.id)).toEqual(['display', 'serif', 'mono'])
  })

  it('testimonial leads with the quote, defaults to medium', () => {
    const t = getBlockSpec('amsterdam', 'testimonial')
    expect(t.defaultVariant).toBe('quote-above')
    expect(t.defaultSize).toBe('medium')
    expect(t.fonts.map(f => f.id)).toEqual(['display', 'serif', 'mono'])
  })

  it('resolves inks: vermilion default, invalid ids fall back', () => {
    expect(resolveAmsterdamInk(undefined)).toBe('vermilion')
    expect(resolveAmsterdamInk({ amsterdamInk: 'nope' })).toBe('vermilion')
    expect(resolveAmsterdamInk({ amsterdamInk: 'ultramarine' })).toBe('ultramarine')
    expect(amsterdamInkColors({ amsterdamInk: 'black' })).toMatchObject({ ink: '#141210', onInk: '#f6efe4', bodyOnInk: '#f1ece2' })
    expect(AMSTERDAM_INKS.vermilion).toMatchObject({ ink: '#e02b20', onInk: '#faf7f2', bodyOnInk: '#141210' })
  })
})
