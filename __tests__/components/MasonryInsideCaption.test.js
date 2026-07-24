import { render } from '@testing-library/react'
import MasonryGallery from '../../components/image-displays/gallery/masonry-gallery/MasonryGallery'

const images = [{ url: 'https://x/a.jpg', caption: 'Golden hour' }]

it('renders the caption below by default', () => {
  const { getByText } = render(<MasonryGallery images={images} />)
  expect(getByText('Golden hour').closest('[data-hover-caption]')).toBeNull()
})

it('renders an inside hover caption when insideCaption is set', () => {
  const { getByText } = render(<MasonryGallery images={images} insideCaption />)
  expect(getByText('Golden hour').closest('[data-hover-caption]')).toBeTruthy()
})
