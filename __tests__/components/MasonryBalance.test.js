import { render } from '@testing-library/react'
import MasonryGallery from '@/components/image-displays/gallery/masonry-gallery/MasonryGallery'

// The reported balance bug: a tall portrait, a short landscape, then a medium
// image. Round-robin (react-masonry-css) always put the 3rd image back under
// the 1st (already-tall) column. Height-aware packing must place it under the
// short column instead. Stored aspectRatio (width/height) drives placement, so
// this holds on the first paint with no image-load measurement.
describe('MasonryGallery height-aware balancing', () => {
  const images = [
    { url: 'https://x/tall.jpg', caption: 'tall', aspectRatio: 0.66 },   // portrait
    { url: 'https://x/short.jpg', caption: 'short', aspectRatio: 1.66 }, // landscape
    { url: 'https://x/medium.jpg', caption: 'medium', aspectRatio: 1.0 },
  ]

  it('sends the third image to the shorter column, not back under the tall one', () => {
    const { container } = render(<MasonryGallery images={images} columns={2} />)
    const columns = container.querySelectorAll('.items-start > div')
    expect(columns.length).toBe(2)

    const altsIn = (col) => Array.from(col.querySelectorAll('img')).map((img) => img.getAttribute('alt'))
    expect(altsIn(columns[0])).toEqual(['tall'])
    expect(altsIn(columns[1])).toEqual(['short', 'medium'])
  })
})
