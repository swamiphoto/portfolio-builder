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
  it('sizes Medium font-relatively — mono renders smaller than the serif', () => {
    // Both default to Medium (Kyoto's subheading). Cormorant is small-on-body so
    // it sets ~20px; mono runs large so the same setting renders ~16px, balanced.
    const serif = renderText({ type: 'text', content: 'Hi', font: 'serif' })
    expect(serif.className).toMatch(/text-\[1\.25rem\]/)
    const mono = renderText({ type: 'text', content: 'Hi', font: 'mono' })
    expect(mono.className).toMatch(/text-\[1rem\]/)
    expect(mono.className).not.toMatch(/text-\[1\.25rem\]/)
  })

  it('applies the mono family when font=mono', () => {
    const el = renderText({
      type: 'text',
      content: 'Hello',
      font: 'mono',
      themeState: { kyoto: { variant: 'body' } },
    })
    expect(el.style.fontFamily).toMatch(/Roboto Mono/)
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
