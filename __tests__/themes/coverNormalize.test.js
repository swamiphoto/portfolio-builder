import { normalizePageEntity } from '@/common/assetRefs'

describe('cover normalization', () => {
  it('defaults height to partial when unset', () => {
    const out = normalizePageEntity({ cover: { imageUrl: 'x.jpg' }, blocks: [] })
    expect(out.cover.height).toBe('partial')
  })

  it('migrates ghost button style to outline', () => {
    const out = normalizePageEntity({ cover: { imageUrl: 'x.jpg', buttonStyle: 'ghost' }, blocks: [] })
    expect(out.cover.buttonStyle).toBe('outline')
  })

  it('keeps outline as-is', () => {
    const out = normalizePageEntity({ cover: { imageUrl: 'x.jpg', buttonStyle: 'outline' }, blocks: [] })
    expect(out.cover.buttonStyle).toBe('outline')
  })

  it('defaults unknown buttonStyle to solid', () => {
    const out = normalizePageEntity({ cover: { imageUrl: 'x.jpg', buttonStyle: 'weird' }, blocks: [] })
    expect(out.cover.buttonStyle).toBe('solid')
  })

  it('preserves explicit height full', () => {
    const out = normalizePageEntity({ cover: { imageUrl: 'x.jpg', height: 'full' }, blocks: [] })
    expect(out.cover.height).toBe('full')
  })
})
