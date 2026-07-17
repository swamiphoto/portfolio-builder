import { render } from '@testing-library/react'
import SquareGallery from '@/components/image-displays/gallery/square-gallery/SquareGallery'

describe('SquareGallery focal point', () => {
  it('applies a ref focalPoint as CSS object-position', () => {
    const images = [{ url: 'a.jpg', focalPoint: { x: 0.25, y: 0.75 } }]
    const { container } = render(<SquareGallery images={images} onImageClick={() => {}} />)
    const img = container.querySelector('img')
    expect(img.style.objectPosition).toBe('25% 75%')
  })

  it('defaults to center (50% 50%) when no focalPoint is set', () => {
    const images = [{ url: 'a.jpg' }]
    const { container } = render(<SquareGallery images={images} onImageClick={() => {}} />)
    const img = container.querySelector('img')
    expect(img.style.objectPosition).toBe('50% 50%')
  })
})
