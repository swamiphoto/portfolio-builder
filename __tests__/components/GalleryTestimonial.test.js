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
