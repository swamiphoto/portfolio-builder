import { slugify, heroTitleFor } from '../../common/pageUtils'

describe('slugify', () => {
  it('replaces spaces with dashes and lowercases', () => {
    expect(slugify('My Cool Page')).toBe('my-cool-page')
  })
  it('strips punctuation and collapses dashes', () => {
    expect(slugify('  Hello,  World!! ')).toBe('hello-world')
  })
})

describe('heroTitleFor', () => {
  it('falls back to the page name when heroTitle is absent (tracking)', () => {
    expect(heroTitleFor({ title: 'Portraits' })).toBe('Portraits')
  })
  it('falls back to the name when heroTitle is empty', () => {
    expect(heroTitleFor({ title: 'Portraits', heroTitle: '' })).toBe('Portraits')
  })
  it('uses heroTitle once it has diverged', () => {
    expect(heroTitleFor({ title: 'Portraits', heroTitle: 'Fine Art Portraiture' })).toBe('Fine Art Portraiture')
  })
  it('returns empty string for a nullish page', () => {
    expect(heroTitleFor(null)).toBe('')
  })
})
