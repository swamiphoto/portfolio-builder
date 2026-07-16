// __tests__/components/GridGallery.test.js
import { render } from '@testing-library/react'
import GridGallery from '@/components/image-displays/gallery/grid-gallery/GridGallery'

const imgs = [
  { url: 'a.jpg', width: 1600, height: 1067 }, // landscape, aspect ~1.5
  { url: 'b.jpg', width: 1067, height: 1600 }, // portrait, aspect ~0.667
  { url: 'c.jpg', width: 1600, height: 1067 }, // landscape, aspect ~1.5
]

describe('GridGallery', () => {
  it('renders one img per image', () => {
    const { container } = render(<GridGallery images={imgs} onImageClick={() => {}} />)
    expect(container.querySelectorAll('img').length).toBe(3)
  })

  it('gives the portrait image a smaller flex-grow than a landscape one', () => {
    const { container } = render(<GridGallery images={imgs} onImageClick={() => {}} />)
    const items = container.querySelectorAll('[data-grid-item]')
    const grow = (el) => parseFloat(el.style.flexGrow || '0')
    expect(grow(items[0])).toBeGreaterThan(grow(items[1])) // landscape > portrait
  })
})
