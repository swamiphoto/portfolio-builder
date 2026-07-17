import { render, act } from '@testing-library/react'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), pathname: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const GalleryPreview = require('../../components/admin/gallery-builder/GalleryPreview').default

const squareGallery = (fp) => ({
  name: '', description: '',
  blocks: [{ type: 'photos', themeState: { kyoto: { variant: 'square' } }, images: [{ url: 'a.jpg', focalPoint: fp }], imageUrls: ['a.jpg'] }],
})

// Repositioning fires on every pointer move; the preview must reflect the new
// focal point immediately (bypassing the 250ms content debounce), not after release.
test('a block image focal-point change updates the preview immediately (no debounce wait)', () => {
  jest.useFakeTimers()
  const { container, rerender } = render(
    <GalleryPreview gallery={squareGallery({ x: 0.5, y: 0.5 })} pages={[]} siteConfig={{ design: { theme: 'kyoto' } }} username="me" />
  )
  act(() => {}) // flush mount effects
  expect(container.querySelector('[data-square-item] img').style.objectPosition).toBe('50% 50%')

  // Change the focal point WITHOUT advancing the 250ms debounce timer.
  act(() => {
    rerender(
      <GalleryPreview gallery={squareGallery({ x: 0.2, y: 0.8 })} pages={[]} siteConfig={{ design: { theme: 'kyoto' } }} username="me" />
    )
  })
  expect(container.querySelector('[data-square-item] img').style.objectPosition).toBe('20% 80%')
  jest.useRealTimers()
})
