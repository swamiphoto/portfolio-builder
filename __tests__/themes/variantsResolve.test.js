import { resolveVariant, resolveFont, resolveButtonStyle } from '@/common/themes/variants'

describe('resolveVariant with shared ids + aliases', () => {
  it('accepts a saved shared id', () => {
    const b = { type: 'photos', themeState: { kyoto: { variant: 'grid' } } }
    expect(resolveVariant(b, 'kyoto')).toBe('grid')
  })
  it('aliases legacy manhattan photo ids to shared ids', () => {
    const b = { type: 'photo', themeState: { manhattan: { variant: 'framed' } } }
    expect(resolveVariant(b, 'manhattan')).toBe('centered')
  })
  it('falls back to default when nothing valid', () => {
    expect(resolveVariant({ type: 'photos' }, 'kyoto')).toBe('stacked')
  })
})

describe('resolveFont', () => {
  it('maps the block font slot to the theme family', () => {
    const b = { type: 'text', font: 'mono' }
    expect(resolveFont(b, 'kyoto')).toMatch(/Geist Mono/)
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
