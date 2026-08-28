import { render } from '@testing-library/react'
import MasonryGallery from '../../components/image-displays/gallery/masonry-gallery/MasonryGallery'

const images = [{ url: 'https://x/a.jpg', caption: 'Golden hour' }]

it('renders the caption below by default', () => {
  const { getByText } = render(<MasonryGallery images={images} />)
  expect(getByText('Golden hour').closest('[data-hover-caption]')).toBeNull()
})

it('renders a hover caption plus a mobile below-caption when insideCaption is set', () => {
  const { getAllByText } = render(<MasonryGallery images={images} insideCaption />)
  const caps = getAllByText('Golden hour')
  expect(caps).toHaveLength(2)
  expect(caps.some((el) => el.closest('[data-hover-caption]'))).toBe(true)
  // The below copy only shows on mobile, where the hover overlay is hidden.
  expect(caps.some((el) => !el.closest('[data-hover-caption]') && el.hasAttribute('data-mobile-caption'))).toBe(true)
})
