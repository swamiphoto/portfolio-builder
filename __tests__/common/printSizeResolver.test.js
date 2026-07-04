import {
  sizeFitsResolution,
  availableSizes,
  maxSharpSize,
} from '../../common/print/printSizeResolver'

const SIZES = [
  { id: '8x10', wIn: 8, hIn: 10 },
  { id: '16x24', wIn: 16, hIn: 24 },
  { id: '24x36', wIn: 24, hIn: 36 },
]

describe('sizeFitsResolution', () => {
  it('is orientation-agnostic (landscape image, portrait size spec)', () => {
    // 3600x2400 landscape vs 16x24 portrait spec: long edges 3600/24=150dpi -> fails at 240
    expect(sizeFitsResolution({ id: '16x24', wIn: 16, hIn: 24 }, 3600, 2400)).toBe(false)
    // 5760x3840 landscape vs 16x24: 5760/24=240, 3840/16=240 -> exactly fits
    expect(sizeFitsResolution({ id: '16x24', wIn: 16, hIn: 24 }, 5760, 3840)).toBe(true)
  })

  it('honors a custom minDpi', () => {
    expect(sizeFitsResolution({ id: '8x10', wIn: 8, hIn: 10 }, 1200, 960, 120)).toBe(true)
    expect(sizeFitsResolution({ id: '8x10', wIn: 8, hIn: 10 }, 1200, 960, 240)).toBe(false)
  })
})

describe('availableSizes', () => {
  it('returns only sizes that meet the dpi floor', () => {
    // 6000x4000: 8x10 ok, 16x24 (needs 5760x3840) ok, 24x36 (needs 8640x5760) fails
    expect(availableSizes(6000, 4000, SIZES)).toEqual(['8x10', '16x24'])
  })

  it('returns [] when the image is too small for anything', () => {
    expect(availableSizes(800, 600, SIZES)).toEqual([])
  })
})

describe('maxSharpSize', () => {
  it('returns the largest-area size that fits', () => {
    expect(maxSharpSize(6000, 4000, SIZES)).toBe('16x24')
  })

  it('returns null when nothing fits', () => {
    expect(maxSharpSize(800, 600, SIZES)).toBe(null)
  })
})
