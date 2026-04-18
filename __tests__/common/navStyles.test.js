import { resolveNavStyle } from '../../common/navStyles'

describe('resolveNavStyle', () => {
  it('returns cover-embedded for minimal-light', () => {
    expect(resolveNavStyle('minimal-light')).toBe('cover-embedded')
  })
  it('returns cover-embedded for minimal-dark', () => {
    expect(resolveNavStyle('minimal-dark')).toBe('cover-embedded')
  })
  it('returns header-dropdown for editorial', () => {
    expect(resolveNavStyle('editorial')).toBe('header-dropdown')
  })
  it('falls back to cover-embedded for unknown themes', () => {
    expect(resolveNavStyle('made-up')).toBe('cover-embedded')
  })
})
