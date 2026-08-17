import { render } from '@testing-library/react'
jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), asPath: '/' }) }))
import GalleryPreview from '@/components/admin/gallery-builder/GalleryPreview'

// The per-page theme override must reach the actual gallery render (layout + block
// treatments), not just the outer ThemeProvider. A kyoto site page overridden to
// amsterdam should render the Amsterdam wall, not the kyoto layout.
describe('GalleryPreview theme override', () => {
  const siteConfig = { design: { theme: 'kyoto' }, pages: [], siteName: 'X' }
  const gallery = { name: 'X', description: '', blocks: [{ type: 'photo', image: 'https://x/a.jpg' }] }

  it('renders in the explicit themeId prop, overriding the site theme', () => {
    const { container } = render(
      <GalleryPreview gallery={gallery} themeId="amsterdam" siteConfig={siteConfig} pages={[]} noWrap />
    )
    expect(container.querySelector('[data-theme="amsterdam"]')).toBeTruthy()
    expect(container.querySelector('.ams-stage')).toBeTruthy()
  })

  it('falls back to the site theme when no themeId is given', () => {
    const { container } = render(
      <GalleryPreview gallery={gallery} siteConfig={siteConfig} pages={[]} noWrap />
    )
    expect(container.querySelector('[data-theme="kyoto"]')).toBeTruthy()
    expect(container.querySelector('.ams-stage')).toBeNull()
  })
})
