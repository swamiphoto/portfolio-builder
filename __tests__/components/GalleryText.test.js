// Task 12: text block font — resolveFont wired to inline style.fontFamily
import { render } from '@testing-library/react'

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const Gallery = require('../../components/image-displays/gallery/Gallery').default

function renderText(block) {
  const { container } = render(
    <Gallery
      name=""
      description=""
      blocks={[block]}
      pages={[]}
      themeId="kyoto"
      siteConfig={{}}
    />
  )
  return container.querySelector('.text-block')
}

describe('text block font', () => {
  it('applies the display family when font=display', () => {
    const el = renderText({
      type: 'text',
      content: 'Hello',
      font: 'display',
      themeState: { kyoto: { variant: 'body' } },
    })
    expect(el.style.fontFamily).toMatch(/Muse/)
  })

  it('defaults to the serif family', () => {
    const el = renderText({
      type: 'text',
      content: 'Hello',
      themeState: { kyoto: { variant: 'body' } },
    })
    expect(el.style.fontFamily).toMatch(/Cormorant/)
  })
})
