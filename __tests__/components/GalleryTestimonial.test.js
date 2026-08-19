// Task 14: testimonial empty-state placeholder mirrors variant ordering
import { render } from '@testing-library/react'

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const Gallery = require('../../components/image-displays/gallery/Gallery').default

function renderT(block) {
  const { container } = render(
    <Gallery name="" description="" blocks={[block]} pages={[]} themeId="kyoto" showPlaceholders={true} />
  )
  return container.querySelector('[data-testimonial-placeholder]')
}

describe('testimonial empty state mirrors variant', () => {
  it('photo-above puts the avatar first (photo-first)', () => {
    const el = renderT({ type: 'testimonial', themeState: { kyoto: { variant: 'photo-above' } } })
    expect(el.getAttribute('data-order')).toBe('photo-first')
  })

  it('quote-above puts the avatar last (photo-last)', () => {
    const el = renderT({ type: 'testimonial', themeState: { kyoto: { variant: 'quote-above' } } })
    expect(el.getAttribute('data-order')).toBe('photo-last')
  })
})

// Imported quotes almost always land with imageUrl: '' (bindAssets has no
// avatar to bind). This must render as a clean quote + name — no empty/broken
// avatar circle — while a testimonial WITH an avatar still renders its <img>.
describe('testimonial with no avatar (common import case)', () => {
  function renderFilled(block) {
    const { container } = render(
      <Gallery name="" description="" blocks={[block]} pages={[]} themeId="kyoto" showPlaceholders={true} />
    )
    return container.querySelector('.testimonial-block')
  }

  it('renders no <img> when imageUrl is empty, but still renders the quote and name', () => {
    const el = renderFilled({ type: 'testimonial', text: 'Great work.', name: 'Naga', imageUrl: '', variant: 1 })
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toContain('Great work.')
    expect(el.textContent).toContain('Naga')
  })

  it('still renders the <img> when imageUrl is present', () => {
    const el = renderFilled({ type: 'testimonial', text: 'Great work.', name: 'Naga', imageUrl: 'https://gcs/face.jpg', variant: 1 })
    expect(el.querySelector('img')).not.toBeNull()
  })
})
