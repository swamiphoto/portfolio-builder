import { render } from '@testing-library/react'
import SquareGallery from '@/components/image-displays/gallery/square-gallery/SquareGallery'

const imgs = [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }, { url: 'd.jpg' }]

describe('SquareGallery', () => {
  it('renders every image cropped to a square', () => {
    const { container } = render(<SquareGallery images={imgs} onImageClick={() => {}} />)
    const cells = container.querySelectorAll('[data-square-item]')
    expect(cells.length).toBe(4)
    cells.forEach((c) => expect(c.className).toMatch(/aspect-square/))
    container.querySelectorAll('img').forEach((im) => expect(im.className).toMatch(/object-cover/))
  })
})
