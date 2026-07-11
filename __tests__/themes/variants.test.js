import { resolveVariant, setVariant, resolveAlign } from '@/common/themes/variants'

describe('resolveVariant', () => {
  it('uses saved themeState when valid for the theme', () => {
    const block = { type: 'photo', themeState: { kyoto: { variant: 'centered' } } }
    expect(resolveVariant(block, 'kyoto')).toBe('centered')
  })

  it('falls back to the theme default when no state exists', () => {
    expect(resolveVariant({ type: 'photo' }, 'kyoto')).toBe('full-bleed')
    expect(resolveVariant({ type: 'photo' }, 'manhattan')).toBe('full-width')
  })

  it('falls back to the theme default when saved variant is invalid for that theme', () => {
    const block = { type: 'photo', themeState: { manhattan: { variant: 'full-bleed' } } }
    // 'full-bleed' is a Kyoto id, not a Manhattan id
    expect(resolveVariant(block, 'manhattan')).toBe('full-width')
  })

  it('does not cross theme keys', () => {
    const block = { type: 'photo', themeState: { kyoto: { variant: 'centered' } } }
    expect(resolveVariant(block, 'manhattan')).toBe('full-width')
  })

  it('reads legacy photo variant/layout when themeState is absent', () => {
    expect(resolveVariant({ type: 'photo', variant: 2 }, 'kyoto')).toBe('centered')
    expect(resolveVariant({ type: 'photo', layout: 'Centered' }, 'kyoto')).toBe('centered')
    expect(resolveVariant({ type: 'photo', variant: 1 }, 'kyoto')).toBe('full-bleed')
  })

  it('reads legacy text variant numbers', () => {
    expect(resolveVariant({ type: 'text', variant: 1 }, 'kyoto')).toBe('heading')
    expect(resolveVariant({ type: 'text', variant: 2 }, 'kyoto')).toBe('subheading')
    expect(resolveVariant({ type: 'text', variant: 3 }, 'kyoto')).toBe('body')
    expect(resolveVariant({ type: 'text', variant: 4 }, 'kyoto')).toBe('quote')
  })
})

describe('setVariant', () => {
  it('writes only the target theme key and keeps content + other themes', () => {
    const block = { type: 'photo', imageUrl: 'x', themeState: { kyoto: { variant: 'centered' } } }
    const next = setVariant(block, 'manhattan', 'framed')
    expect(next).not.toBe(block)
    expect(next.imageUrl).toBe('x')
    expect(next.themeState.kyoto.variant).toBe('centered')
    expect(next.themeState.manhattan.variant).toBe('framed')
  })

  it('creates themeState when missing', () => {
    const next = setVariant({ type: 'photo' }, 'kyoto', 'centered')
    expect(next.themeState.kyoto.variant).toBe('centered')
  })
})

describe('resolveAlign', () => {
  it('prefers block.align, else theme default', () => {
    expect(resolveAlign({ type: 'text', align: 'left' }, 'kyoto')).toBe('left')
    expect(resolveAlign({ type: 'text' }, 'kyoto')).toBe('center')
    expect(resolveAlign({ type: 'text' }, 'manhattan')).toBe('left')
  })
})
