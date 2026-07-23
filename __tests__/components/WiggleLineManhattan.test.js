import { render } from '@testing-library/react'
import WiggleLine from '../../components/wiggle-line/WiggleLine'

describe('WiggleLine', () => {
  it('uses centered margins by default', () => {
    const { container } = render(<WiggleLine />)
    expect(container.querySelector('svg').getAttribute('class')).toContain('mx-auto')
  })

  it('honors a custom className for left alignment', () => {
    const { container } = render(<WiggleLine className="my-6 ml-0" />)
    const cls = container.querySelector('svg').getAttribute('class')
    expect(cls).toContain('ml-0')
    expect(cls).not.toContain('mx-auto')
  })
})

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const Gallery = require('../../components/image-displays/gallery/Gallery').default

const photosBlock = { type: 'photos', images: [{ url: 'https://x/a.jpg' }] }

function renderGallery(themeId) {
  return render(
    <Gallery name="P" description="" blocks={[photosBlock]} themeId={themeId} username="u" basePath="/sites/u" />
  )
}

describe('Gallery section dividers', () => {
  it('renders wiggle dividers for kyoto', () => {
    const { container } = renderGallery('kyoto')
    expect(container.querySelectorAll('svg path[d^="M0 5C10"]').length).toBeGreaterThan(0)
  })
  it('renders no wiggle dividers for manhattan', () => {
    const { container } = renderGallery('manhattan')
    expect(container.querySelectorAll('svg path[d^="M0 5C10"]').length).toBe(0)
  })
})
