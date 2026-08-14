import { resolveVariant, setVariant, resolveAlign } from '@/common/themes/variants'

describe('resolveVariant', () => {
  it('uses saved themeState when valid for the theme', () => {
    const block = { type: 'photo', themeState: { kyoto: { variant: 'centered' } } }
    expect(resolveVariant(block, 'kyoto')).toBe('centered')
  })

  it('falls back to the theme default when no state exists', () => {
    expect(resolveVariant({ type: 'photo' }, 'kyoto')).toBe('centered') // Kyoto defaults photos to Centered
    expect(resolveVariant({ type: 'photo' }, 'manhattan')).toBe('single')
  })

  it('falls back to the theme default when saved variant is not present', () => {
    const block = { type: 'photo', themeState: { manhattan: { variant: 'full-width' } } }
    // 'full-width' is the old manhattan-local id; no longer valid — falls back to manhattan's single-photo default
    expect(resolveVariant(block, 'manhattan')).toBe('single')
  })

  it('does not cross theme keys', () => {
    const block = { type: 'photo', themeState: { kyoto: { variant: 'centered' } } }
    expect(resolveVariant(block, 'manhattan')).toBe('single')
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
    // Quote was removed; legacy quote blocks (variant 4) fall back to the default.
    expect(resolveVariant({ type: 'text', variant: 4 }, 'kyoto')).toBe('subheading')
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
    expect(block.themeState.manhattan).toBeUndefined()
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
