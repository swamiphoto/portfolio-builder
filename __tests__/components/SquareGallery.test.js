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

  it('defaults to 3 columns (medium)', () => {
    const { container } = render(<SquareGallery images={imgs(6)} onImageClick={() => {}} />)
    const grid = container.querySelector('[data-square-item]').parentElement
    expect(grid.style.gridTemplateColumns).toMatch(/repeat\(3,/)
  })

  it('maxCols drives column count (size: large 2 / medium 3 / small 4)', () => {
    const large = render(<SquareGallery images={imgs(6)} maxCols={2} onImageClick={() => {}} />)
    expect(large.container.querySelector('[data-square-item]').parentElement.style.gridTemplateColumns).toMatch(/repeat\(2,/)

    const small = render(<SquareGallery images={imgs(6)} maxCols={4} onImageClick={() => {}} />)
    expect(small.container.querySelector('[data-square-item]').parentElement.style.gridTemplateColumns).toMatch(/repeat\(4,/)
  })

  it('never renders more columns than images', () => {
    const { container } = render(<SquareGallery images={imgs(2)} maxCols={4} onImageClick={() => {}} />)
    const grid = container.querySelector('[data-square-item]').parentElement
    expect(grid.style.gridTemplateColumns).toMatch(/repeat\(2,/)
  })
})
