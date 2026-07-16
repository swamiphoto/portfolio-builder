// Regression guard: repositioning a page-gallery thumbnail changes the focal point
// on a *linked* page (inside `pages`), not in the edited gallery's own blocks. The
// preview's heavy <Gallery> is memoized without `pages` for typing performance, so
// it must still recompute when thumbnail/focal data changes — otherwise the preview
// stops updating live during reposition.
import { render, screen } from '@testing-library/react'

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const GalleryPreview = require('../../components/admin/gallery-builder/GalleryPreview').default

const gallery = { name: 'Home', description: '', blocks: [{ type: 'page-gallery', source: 'manual', pageIds: ['pg1'] }] }
const pageAt = (fp) => [{ id: 'pg1', title: 'Trips', slug: 'trips', thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false, focalPoint: fp } }]

test('preview updates a page-gallery thumbnail live when its focal point changes', () => {
  const { rerender } = render(
    <GalleryPreview gallery={gallery} pages={pageAt({ x: 0.5, y: 0.5 })} siteConfig={{}} username="jane" />
  )
  expect(screen.getByAltText('Trips').style.objectPosition).toBe('50% 50%')

  // Reposition: same gallery/blocks, only the linked page's focal point changed.
  rerender(
    <GalleryPreview gallery={gallery} pages={pageAt({ x: 0.25, y: 0.75 })} siteConfig={{}} username="jane" />
  )
  expect(screen.getByAltText('Trips').style.objectPosition).toBe('25% 75%')
})
