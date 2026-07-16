import { resolveVariant } from '@/common/themes/variants'
import { defaultBlock } from '@/common/blocks'

describe('video default variant is now Centered', () => {
  it('a brand-new video block resolves to centered', () => {
    const block = defaultBlock('video')
    expect(resolveVariant(block, 'kyoto')).toBe('centered')
  })

  it('a legacy block that explicitly chose full-bleed (variant 1) stays full-bleed', () => {
    expect(resolveVariant({ type: 'video', variant: 1 }, 'kyoto')).toBe('full-bleed')
  })

  it('an empty video block with no variant field defaults to centered', () => {
    expect(resolveVariant({ type: 'video' }, 'kyoto')).toBe('centered')
  })
})
