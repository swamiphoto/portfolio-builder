import { packColumns } from '@/components/image-displays/gallery/masonry-gallery/packColumns'

describe('packColumns', () => {
  it('sends the next image to the shortest column instead of round-robin', () => {
    // The reported case: tall portrait, short landscape, medium.
    // Round-robin (i % 2) would put image 2 back under image 0 (already tall).
    // Height-aware packing must put it under image 1 (the short column).
    const factors = [1.5 /* tall */, 0.6 /* short */, 1.0 /* medium */]
    expect(packColumns(factors, 2)).toEqual([[0], [1, 2]])
  })

  it('keeps within-column order in source order', () => {
    const factors = [1, 1, 1, 1]
    expect(packColumns(factors, 2)).toEqual([[0, 2], [1, 3]])
  })

  it('breaks ties toward the leftmost column', () => {
    const factors = [1, 1, 1]
    expect(packColumns(factors, 3)).toEqual([[0], [1], [2]])
  })

  it('stacks everything in one column when columnCount is 1', () => {
    expect(packColumns([2, 0.5, 1], 1)).toEqual([[0, 1, 2]])
  })

  it('treats missing/invalid factors as a neutral height', () => {
    // null/0/NaN fall back to 1 rather than starving a column.
    expect(packColumns([null, undefined, NaN, 0], 2)).toEqual([[0, 2], [1, 3]])
  })

  it('balances a lopsided set across three columns', () => {
    const factors = [3, 1, 1, 1, 1]
    // i0(3)->c0. i1(1)->c1. i2(1)->c2. i3(1)->c1(=1<3). i4(1)->c2(=1<3).
    expect(packColumns(factors, 3)).toEqual([[0], [1, 3], [2, 4]])
  })
})
