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
