// __tests__/themes/pageGalleryVariants.test.js
import { getBlockSpec } from '@/common/themes'

describe('page-gallery variants', () => {
  it('kyoto page-gallery exposes list, alternating, grid', () => {
    const spec = getBlockSpec('kyoto', 'page-gallery')
    expect(spec.variants.map(v => v.id)).toEqual(['list', 'alternating', 'grid'])
    expect(spec.defaultVariant).toBe('list')
  })
})
