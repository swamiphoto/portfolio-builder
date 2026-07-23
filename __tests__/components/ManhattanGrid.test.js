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

it('renders an inside hover caption when an image has a caption', () => {
  const images = [{ url: 'https://x/a.jpg', caption: 'On the bridge' }]
  const { container, getByText } = render(<ManhattanGrid images={images} />)
  expect(getByText('On the bridge').closest('[data-hover-caption]')).toBeTruthy()
})

it('renders sharp-cornered tiles (no rounded utility on the image)', () => {
  const images = [{ url: 'https://x/a.jpg', caption: '' }]
  const { container } = render(<ManhattanGrid images={images} />)
  const img = container.querySelector('img')
  expect(img.className).not.toMatch(/rounded/)
})
