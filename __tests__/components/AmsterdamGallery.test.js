// __tests__/components/AmsterdamGallery.test.js
// Mirrors FlorenceGallery.test.js: the wall is reached through Gallery.
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'
import PageCover from '@/components/image-displays/page/PageCover'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), asPath: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))

describe('Amsterdam wall via Gallery', () => {
  it('short-circuits to the Amsterdam stage with the title opener', () => {
    const { container } = render(
      <Gallery blocks={[{ type: 'text', content: 'Hello', amsterdamStyle: 'panel' }]} themeId="amsterdam" name="Iceland" siteConfig={{}} />
    )
    expect(container.querySelector('.ams-stage')).toBeTruthy()
    expect(container.querySelector('.ams-col--title .ams-title__name').textContent).toBe('Iceland')
    expect(container.querySelector('.ams-col--panel')).toBeTruthy()
  })

  it('renders the poster hero when cover + opener=hero are passed', () => {
    const { container } = render(
      <Gallery blocks={[]} themeId="amsterdam" name="Van der Meer" siteConfig={{}} cover={{ imageUrl: 'https://x/c.jpg' }} opener="hero" />
    )
    expect(container.querySelector('.ams-col--hero .ams-hero__title').textContent).toBe('Van der Meer')
  })

  it('PageCover renders nothing for amsterdam (the wall owns the opener)', () => {
    const { container } = render(<PageCover themeId="amsterdam" cover={{ imageUrl: 'https://x/c.jpg' }} title="T" />)
    expect(container.firstChild).toBeNull()
  })
})
