import { render } from '@testing-library/react'
import PageCover from '@/components/image-displays/page/PageCover'

const cover = (extra = {}) => ({ imageUrl: 'https://x/hero.jpg', ...extra })

describe('PageCover height default', () => {
  it('defaults to partial (h-[60vh]) when no height is set', () => {
    const { container } = render(<PageCover cover={cover()} title="Jane" />)
    expect(container.querySelector('section').className).toMatch(/h-\[60vh\]/)
  })

  it('is full (h-screen) only when height is explicitly "full"', () => {
    const { container } = render(<PageCover cover={cover({ height: 'full' })} title="Jane" />)
    expect(container.querySelector('section').className).toMatch(/h-screen/)
  })

  it('renders an outline button when buttonStyle is outline', () => {
    const { getByText } = render(
      <PageCover cover={cover({ buttonStyle: 'outline' })} title="Jane" slideshowHref="/s" />
    )
    expect(getByText('View Music Show').className).toMatch(/border/)
  })
})

describe('PageCover — provence split cover', () => {
  it('renders the split-screen cover with eyebrow, title, and a default CTA', () => {
    const { container, getByText } = render(
      <PageCover cover={cover({ height: 'full' })} title="Wasserman Family" siteName="Alex Michele Photography" themeId="provence" />
    )
    expect(container.querySelector('section.provence-cover')).toBeTruthy()
    expect(getByText('Alex Michele Photography')).toBeTruthy()
    expect(getByText('Wasserman Family')).toBeTruthy()
    // No primaryButton / slideshow → the CTA scrolls into the gallery below
    expect(getByText('View Gallery')).toBeTruthy()
  })

  it('renders nothing when there is no cover image', () => {
    const { container } = render(<PageCover cover={null} title="Jane" themeId="provence" />)
    expect(container.querySelector('section.provence-cover')).toBeNull()
  })
})
