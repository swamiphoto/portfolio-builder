// __tests__/themes/base.test.js
import { baseBlocks, baseCover, FONT_SLOTS, mergeBlockSpec } from '@/common/themes/base'

describe('base registry', () => {
  it('photos exposes stacked, masonry, grid, square with stacked default', () => {
    expect(baseBlocks.photos.defaultVariant).toBe('stacked')
    expect(baseBlocks.photos.variants.map(v => v.id)).toEqual(['stacked', 'masonry', 'grid', 'square'])
  })

  it('text exposes the shared font slots and center default align', () => {
    expect(baseBlocks.text.fonts.map(f => f.id)).toEqual(['serif', 'display', 'fraunces', 'sans', 'mono'])
    expect(baseBlocks.text.defaultFont).toBe('serif')
    expect(baseBlocks.text.defaultAlign).toBe('center')
  })

  it('video full-bleed label reads "Full bleed"', () => {
    const fb = baseBlocks.video.variants.find(v => v.id === 'full-bleed')
    expect(fb.label).toBe('Full bleed')
  })

  it('contact exposes aligns + solid/outline button styles and a single standard variant', () => {
    expect(baseBlocks.contact.aligns).toEqual(['left', 'center'])
    expect(baseBlocks.contact.buttonStyles.map(b => b.id)).toEqual(['solid', 'outline'])
    expect(baseBlocks.contact.variants.map(v => v.id)).toEqual(['standard'])
  })

  it('cover defaults to partial height and solid/outline only', () => {
    expect(baseCover.defaultHeight).toBe('partial')
    expect(baseCover.buttonStyles.map(b => b.id)).toEqual(['solid', 'outline'])
  })

  it('mergeBlockSpec applies default, labels, hide, and add', () => {
    const merged = mergeBlockSpec(baseBlocks.photo, {
      defaultVariant: 'centered',
      labels: { 'full-bleed': 'Full width', centered: 'Framed' },
    })
    expect(merged.defaultVariant).toBe('centered')
    expect(merged.variants).toEqual([
      { id: 'full-bleed', label: 'Full width' },
      { id: 'centered', label: 'Framed' },
    ])
    // base is not mutated
    expect(baseBlocks.photo.variants[0].label).toBe('Full bleed')

    const hidden = mergeBlockSpec(baseBlocks.video, { hide: ['side-by-side'] })
    expect(hidden.variants.map(v => v.id)).toEqual(['full-bleed', 'centered'])

    const added = mergeBlockSpec(baseBlocks.photos, { add: [{ id: 'carousel', label: 'Carousel' }] })
    expect(added.variants.map(v => v.id)).toContain('carousel')
  })

  it('FONT_SLOTS is exported for popup consumption', () => {
    expect(FONT_SLOTS.map(f => f.id)).toContain('mono')
  })

  it('mergeBlockSpec with no override returns a fresh object (not the baseSpec reference)', () => {
    const result = mergeBlockSpec(baseBlocks.photo)
    expect(result).not.toBe(baseBlocks.photo)
    expect(result.variants).not.toBe(baseBlocks.photo.variants)
    // Mutating the returned variants must not affect the base
    result.variants.push({ id: 'injected', label: 'Injected' })
    expect(baseBlocks.photo.variants.map(v => v.id)).toEqual(['full-bleed', 'centered'])
  })

  it('baseBlocks.text.fonts is a decoupled copy of FONT_SLOTS', () => {
    expect(baseBlocks.text.fonts).not.toBe(FONT_SLOTS)
  })
})
