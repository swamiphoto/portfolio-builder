import { render, screen, fireEvent } from '@testing-library/react'
import AdminPhotoLightbox from '@/components/admin/AdminPhotoLightbox'

const noop = () => {}
const image = { url: 'https://cdn.test/users/u1/photos/import/a.jpg', caption: 'A', assetId: 'a1' }

describe('AdminPhotoLightbox display fallback', () => {
  it('requests the display variant first', () => {
    render(<AdminPhotoLightbox images={[image]} index={0} onClose={noop} onNavigate={noop} />)
    const img = screen.getByAltText('A')
    expect(img.getAttribute('src')).toContain('/display/')
  })

  it('falls back to the original when the display variant 404s (older images have no /display/ object)', () => {
    render(<AdminPhotoLightbox images={[image]} index={0} onClose={noop} onNavigate={noop} />)
    const img = screen.getByAltText('A')
    fireEvent.error(img)
    expect(img.getAttribute('src')).toBe(image.url)
  })
})
