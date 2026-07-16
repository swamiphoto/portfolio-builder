import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), pathname: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

// The empty-state preview (right side) must mirror the chosen photos layout so
// the photographer previews it before adding images.
function renderEmptyPhotos(variant) {
  const block = { type: 'photos', images: [], imageUrls: [], themeState: { kyoto: { variant } } }
  const { container } = render(
    <Gallery name="" description="" blocks={[block]} pages={[]} themeId="kyoto" showPlaceholders />
  )
  return container.querySelector('[data-photos-placeholder]')
}

describe('photos empty-state preview mirrors the layout', () => {
  it.each(['stacked', 'masonry', 'grid', 'square'])('renders the %s placeholder', (variant) => {
    const el = renderEmptyPhotos(variant)
    expect(el).not.toBeNull()
    expect(el.getAttribute('data-photos-placeholder')).toBe(variant)
  })
})
