// __tests__/components/GalleryThemeVariants.test.js
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'

// Router + responsive hooks used by Gallery need light mocks.
jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), asPath: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))

function renderGallery(blocks, themeId) {
  return render(<Gallery blocks={blocks} themeId={themeId} siteConfig={{}} />)
}

describe('Gallery variant resolution', () => {
  it('renders a text block using themeState variant for the active theme', () => {
    const block = { type: 'text', content: 'Hello world', themeState: { kyoto: { variant: 'body' } } }
    const { container } = renderGallery([block], 'kyoto')
    const el = container.querySelector('.text-block')
    // body variant => text-base class present, not the 3xl heading
    expect(el.className).toMatch(/text-base/)
    expect(el.className).not.toMatch(/text-3xl/)
  })

  it('falls back to theme default when no state for the active theme', () => {
    const block = { type: 'text', content: 'Hi', themeState: { manhattan: { variant: 'body' } } }
    const { container } = renderGallery([block], 'kyoto') // kyoto default = heading
    expect(container.querySelector('.text-block').className).toMatch(/text-3xl/)
  })
})
