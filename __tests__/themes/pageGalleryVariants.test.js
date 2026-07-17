// __tests__/themes/pageGalleryVariants.test.js
import { getBlockSpec } from '@/common/themes'
import { resolveVariant } from '@/common/themes/variants'

describe('page-gallery variants', () => {
  it('kyoto page-gallery exposes list and mosaic', () => {
    const spec = getBlockSpec('kyoto', 'page-gallery')
    expect(spec.variants.map(v => v.id)).toEqual(['list', 'mosaic'])
    expect(spec.defaultVariant).toBe('list')
  })

  it('resolveVariant aliases the just-shipped grid id to mosaic', () => {
    const block = { type: 'page-gallery', themeState: { kyoto: { variant: 'grid' } } }
    expect(resolveVariant(block, 'kyoto')).toBe('mosaic')
  })

  it('resolveVariant aliases the just-shipped alternating id to list', () => {
    const block = { type: 'page-gallery', themeState: { kyoto: { variant: 'alternating' } } }
    expect(resolveVariant(block, 'kyoto')).toBe('list')
  })
})
