import { getBlockSpec } from '@/common/themes'
import { amsterdam, AMSTERDAM_INKS, resolveAmsterdamInk, amsterdamInkColors } from '@/common/themes/amsterdam'

describe('amsterdam theme', () => {
  it('is a left-rail theme with the poster palette', () => {
    expect(amsterdam.id).toBe('amsterdam')
    expect(amsterdam.navStyle).toBe('left-rail')
    expect(amsterdam.tokens['--theme-bg']).toBe('#f6efe4')
    expect(amsterdam.tokens.fonts.display).toContain('Abril Fatface')
    expect(amsterdam.tokens.fonts.serif).toContain('Playfair Display')
    expect(amsterdam.tokens.fonts.condensed).toContain('Anton')
  })

  it('photo defaults to full-height Fill; photos to Row (+Mosaic)', () => {
    const photo = getBlockSpec('amsterdam', 'photo')
    expect(photo.defaultVariant).toBe('full-height')
    expect(photo.variants.map(v => v.id).sort()).toEqual(['centered', 'full-height'])
    const photos = getBlockSpec('amsterdam', 'photos')
    expect(photos.defaultVariant).toBe('row')
    expect(photos.variants.map(v => v.id).sort()).toEqual(['mosaic', 'row'])
  })

  it('text keeps the L/M/S size variants and defaults to the Display font', () => {
    const text = getBlockSpec('amsterdam', 'text')
    expect(text.variants.map(v => v.id)).toEqual(['heading', 'subheading', 'body'])
    expect(text.defaultFont).toBe('display')
    expect(text.fonts.map(f => f.id)).toEqual(['display', 'serif', 'condensed', 'mono'])
  })

  it('resolves inks: vermilion default, invalid ids fall back', () => {
    expect(resolveAmsterdamInk(undefined)).toBe('vermilion')
    expect(resolveAmsterdamInk({ amsterdamInk: 'nope' })).toBe('vermilion')
    expect(resolveAmsterdamInk({ amsterdamInk: 'ultramarine' })).toBe('ultramarine')
    expect(amsterdamInkColors({ amsterdamInk: 'black' })).toMatchObject({ ink: '#141210', onInk: '#f6efe4', bodyOnInk: '#f1ece2' })
    expect(AMSTERDAM_INKS.vermilion).toMatchObject({ ink: '#e02b20', onInk: '#faf7f2', bodyOnInk: '#141210' })
  })
})
