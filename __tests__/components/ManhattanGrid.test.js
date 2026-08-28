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

it('renders a hover caption plus a mobile below-caption when an image has one', () => {
  const images = [{ url: 'https://x/a.jpg', caption: 'On the bridge' }]
  const { getAllByText } = render(<ManhattanGrid images={images} />)
  const caps = getAllByText('On the bridge')
  expect(caps).toHaveLength(2)
  expect(caps.some((el) => el.closest('[data-hover-caption]'))).toBe(true)
  expect(caps.some((el) => !el.closest('[data-hover-caption]') && el.hasAttribute('data-mobile-caption'))).toBe(true)
})

it('renders sharp-cornered tiles (no rounded utility on the image)', () => {
  const images = [{ url: 'https://x/a.jpg', caption: '' }]
  const { container } = render(<ManhattanGrid images={images} />)
  const img = container.querySelector('img')
  expect(img.className).not.toMatch(/rounded/)
})
