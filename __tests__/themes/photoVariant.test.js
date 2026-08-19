/** @jest-environment node */
import { resolveVariant } from '@/common/themes/variants'

// Kyoto is the default theme and offers the base photo variants incl. side-by-side.
describe('LEGACY.photo variant numbering', () => {
  it('maps flat variant 3 to side-by-side', () => {
    expect(resolveVariant({ type: 'photo', variant: 3 }, 'kyoto')).toBe('side-by-side')
  })
  it('keeps variant 2 → centered and variant 1 → full-bleed', () => {
    expect(resolveVariant({ type: 'photo', variant: 2 }, 'kyoto')).toBe('centered')
    expect(resolveVariant({ type: 'photo', variant: 1 }, 'kyoto')).toBe('full-bleed')
  })
})
