import { render, screen } from '@testing-library/react'

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const Gallery = require('../../components/image-displays/gallery/Gallery').default

const linkedPage = {
  id: 'pg1',
  title: 'Trips',
  slug: 'trips',
  thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false, focalPoint: { x: 0.25, y: 0.75 } },
}
const linkedPageNoFocal = {
  id: 'pg2',
  title: 'Weddings',
  slug: 'weddings',
  thumbnail: { imageUrl: 'https://x/w.jpg', useCover: false, focalPoint: null },
}
const blocks = [{ type: 'page-gallery', source: 'manual', pageIds: ['pg1', 'pg2'] }]

test('page-gallery card uses focal point as object-position', () => {
  render(<Gallery name="C" description="" blocks={blocks} pages={[linkedPage, linkedPageNoFocal]} />)
  expect(screen.getByAltText('Trips').style.objectPosition).toBe('25% 75%')
})

test('page-gallery card defaults to center when no focal point', () => {
  render(<Gallery name="C" description="" blocks={blocks} pages={[linkedPage, linkedPageNoFocal]} />)
  expect(screen.getByAltText('Weddings').style.objectPosition).toBe('50% 50%')
})
