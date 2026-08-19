/** @jest-environment node */
import { validateBlocks, isEmittableType, EMITTABLE_TYPES } from '@/common/import/blockSchema'
import { defaultBlock } from '@/common/blocks'

describe('blockSchema', () => {
  it('every emittable type is a real block (drift guard)', () => {
    for (const t of EMITTABLE_TYPES) expect(defaultBlock(t).type).toBe(t)
  })
  it('drops blocks of unknown type', () => {
    expect(validateBlocks([{ type: 'carousel' }, { type: 'photo', imageUrl: 'u' }]))
      .toEqual([{ type: 'photo', imageUrl: 'u' }])
  })
  it('drops an empty photo (no imageUrl) and an empty photos block', () => {
    expect(validateBlocks([{ type: 'photo', imageUrl: '' }, { type: 'photos', imageUrls: [] }])).toEqual([])
  })
  it('drops a testimonial with no text', () => {
    expect(validateBlocks([{ type: 'testimonial', text: '' }])).toEqual([])
  })
  it('coerces an out-of-range photo variant to undefined (theme default)', () => {
    const [b] = validateBlocks([{ type: 'photo', imageUrl: 'u', variant: 9 }])
    expect(b.variant).toBeUndefined()
  })
  it('keeps valid photo/text/testimonial/photos/video/page-gallery blocks', () => {
    const blocks = [
      { type: 'photo', imageUrl: 'u', variant: 3, caption: 'c' },
      { type: 'text', variant: 1, content: 'H' },
      { type: 'photos', imageUrls: ['a', 'b'], images: [{ url: 'a' }, { url: 'b' }], layout: 'stacked' },
      { type: 'video', url: 'v' },
      { type: 'page-gallery', source: 'manual', pageIds: ['p1'] },
    ]
    expect(validateBlocks(blocks)).toEqual(blocks)
  })
})
