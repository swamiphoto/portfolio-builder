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
    // body variant (Small) => 0.95rem, not the heading size (1.375rem)
    expect(el.className).toMatch(/text-\[0\.95rem\]/)
    expect(el.className).not.toMatch(/text-\[1\.375rem\]/)
  })

  it('falls back to theme default when no state for the active theme', () => {
    const block = { type: 'text', content: 'Hi', themeState: { manhattan: { variant: 'body' } } }
    const { container } = renderGallery([block], 'kyoto') // kyoto default = subheading (Medium)
    // Medium base => 1.25rem (desktop), not Large (1.375rem)
    expect(container.querySelector('.text-block').className).toMatch(/text-\[1\.25rem\]/)
    expect(container.querySelector('.text-block').className).not.toMatch(/text-\[1\.375rem\]/)
  })
})
