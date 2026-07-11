// __tests__/components/ManhattanGrid.test.js
import { render } from '@testing-library/react'
import ManhattanGrid from '@/components/image-displays/themes/manhattan/ManhattanGrid'

describe('ManhattanGrid', () => {
  it('renders one tile per image and fires onImageClick with the local index', () => {
    const onImageClick = jest.fn()
    const images = [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }]
    const { container } = render(<ManhattanGrid images={images} onImageClick={onImageClick} />)
    const tiles = container.querySelectorAll('img')
    expect(tiles).toHaveLength(3)
    tiles[1].click()
    expect(onImageClick).toHaveBeenCalledWith(1)
  })
})
