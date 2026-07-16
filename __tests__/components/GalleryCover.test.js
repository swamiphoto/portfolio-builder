import { render } from '@testing-library/react'
import GalleryCover from '@/components/image-displays/gallery/gallery-cover/GalleryCover'

// The image-less hero must honor the same Hero-height + button-style controls
// as the image hero (PageCover), so changing them in the design popup is visible.
describe('GalleryCover honors hero controls', () => {
  it('Full height fills the viewport (min-h-screen); Partial does not', () => {
    const { container, rerender } = render(
      <GalleryCover name="Jane" description="Photographer" coverHeight="full" />
    )
    expect(container.firstChild.className).toMatch(/min-h-screen/)

    rerender(<GalleryCover name="Jane" description="Photographer" coverHeight="partial" />)
    expect(container.firstChild.className).not.toMatch(/min-h-screen/)
  })

  it('renders a solid music-show button by default', () => {
    const { container } = render(
      <GalleryCover name="Jane" enableSlideshow onSlideshowClick={() => {}} buttonStyle="solid" />
    )
    const btn = container.querySelector('button')
    expect(btn.className).toMatch(/bg-gray-900/)
  })

  it('renders an outline music-show button when asked', () => {
    const { container } = render(
      <GalleryCover name="Jane" enableSlideshow onSlideshowClick={() => {}} buttonStyle="outline" />
    )
    const btn = container.querySelector('button')
    expect(btn.className).toMatch(/border-gray-900/)
    expect(btn.className).toMatch(/bg-transparent/)
  })
})
