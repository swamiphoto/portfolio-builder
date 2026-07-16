import { render } from '@testing-library/react'
import SquareGallery from '@/components/image-displays/gallery/square-gallery/SquareGallery'

const imgs = (n) => Array.from({ length: n }, (_, i) => ({ url: `${i}.jpg` }))

describe('SquareGallery', () => {
  it('renders every image cropped to a square', () => {
    const { container } = render(<SquareGallery images={imgs(4)} onImageClick={() => {}} />)
    const cells = container.querySelectorAll('[data-square-item]')
    expect(cells.length).toBe(4)
    cells.forEach((c) => expect(c.className).toMatch(/aspect-square/))
    container.querySelectorAll('img').forEach((im) => expect(im.className).toMatch(/object-cover/))
  })

  it('balances 4 images into a 2-column grid (not 3+1)', () => {
    const { container } = render(<SquareGallery images={imgs(4)} onImageClick={() => {}} />)
    const grid = container.querySelector('[data-square-item]').parentElement
    expect(grid.style.gridTemplateColumns).toMatch(/repeat\(2,/)
  })

  it('caps larger sets at 3 columns', () => {
    const { container } = render(<SquareGallery images={imgs(6)} onImageClick={() => {}} />)
    const grid = container.querySelector('[data-square-item]').parentElement
    expect(grid.style.gridTemplateColumns).toMatch(/repeat\(3,/)
  })
})
