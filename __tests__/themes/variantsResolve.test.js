import { resolveVariant, resolveFont, resolveButtonStyle, resolveSize } from '@/common/themes/variants'

describe('resolveSize (page-gallery)', () => {
  it('defaults to medium', () => {
    expect(resolveSize({ type: 'page-gallery' }, 'kyoto')).toBe('medium')
  })
  it('accepts a valid size and rejects an invalid one', () => {
    expect(resolveSize({ type: 'page-gallery', size: 'large' }, 'kyoto')).toBe('large')
    expect(resolveSize({ type: 'page-gallery', size: 'bogus' }, 'kyoto')).toBe('medium')
  })
})

describe('resolveVariant with shared ids + aliases', () => {
  it('accepts a saved shared id', () => {
    const b = { type: 'photos', themeState: { kyoto: { variant: 'grid' } } }
    expect(resolveVariant(b, 'kyoto')).toBe('grid')
  })
  it('legacy manhattan photo variants collapse to the single rendering', () => {
    const b = { type: 'photo', themeState: { manhattan: { variant: 'framed' } } }
    // 'framed' is no longer a valid manhattan photo variant; falls back to manhattan's single-photo default
    expect(resolveVariant(b, 'manhattan')).toBe('single')
  })
  it('falls back to default when nothing valid', () => {
    expect(resolveVariant({ type: 'photos' }, 'kyoto')).toBe('stacked')
  })
})

describe('resolveFont', () => {
  it('maps the block font slot to the theme family', () => {
    const b = { type: 'text', font: 'display' }
    expect(resolveFont(b, 'kyoto')).toMatch(/Muse/)
  })
  it('resets a font slot the theme does not offer back to its default', () => {
    // 'mono' is a real token family but not a text-block font option → default serif.
    expect(resolveFont({ type: 'text', font: 'mono' }, 'kyoto')).toMatch(/Cormorant/)
  })
  it('defaults to serif family when no font set', () => {
    expect(resolveFont({ type: 'text' }, 'kyoto')).toMatch(/Cormorant/)
  })
})

describe('resolveButtonStyle', () => {
  it('accepts a valid style', () => {
    expect(resolveButtonStyle({ type: 'contact', buttonStyle: 'outline' }, 'kyoto')).toBe('outline')
  })
  it('falls back to solid default', () => {
    expect(resolveButtonStyle({ type: 'contact' }, 'kyoto')).toBe('solid')
  })
})
