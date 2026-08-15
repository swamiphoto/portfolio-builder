import { render } from '@testing-library/react'
import AmsterdamWall from '@/components/image-displays/themes/amsterdam/AmsterdamWall'

const CAPTURE = { capturedAt: '2024-03-12T12:00:00Z', cameraModel: 'Nikon Z6' }

function renderWall(blocks, siteConfig = {}, extra = {}) {
  return render(<AmsterdamWall name="W" siteConfig={siteConfig} blocks={blocks} {...extra} />)
}

describe('AmsterdamColumn block treatments', () => {
  it('photo defaults to Fill; Centered gets a caption plaque', () => {
    const { container } = renderWall([
      { type: 'photo', image: 'https://x/one.jpg', caption: 'GRACHT (2024)' },
      { type: 'photo', image: 'https://x/two.jpg', caption: 'BRUG', themeState: { amsterdam: { variant: 'centered' } } },
    ])
    expect(container.querySelector('.ams-col--fill')).toBeTruthy()
    expect(container.querySelectorAll('.ams-col--photo .ams-caption').length).toBeGreaterThanOrEqual(1)
    expect(container.textContent).toContain('BRUG')
  })

  it('photos render as a Row by default and a Mosaic when stored', () => {
    const imgs = Array.from({ length: 5 }, (_, i) => ({ url: `https://x/${i}.jpg` }))
    const { container } = renderWall([
      { type: 'photos', images: imgs.slice(0, 2) },
      { type: 'photos', images: imgs, themeState: { amsterdam: { variant: 'mosaic' } } },
    ])
    expect(container.querySelector('.ams-col--photorow .ams-row')).toBeTruthy()
    expect(container.querySelector('.ams-col--mosaic .ams-mosaic')).toBeTruthy()
  })

  it('text renders as an ink Panel by default and a Quiet column when stored', () => {
    const { container } = renderWall([
      { type: 'text', content: 'Bold words' },
      { type: 'text', content: 'Small words', amsterdamStyle: 'quiet' },
    ])
    const panel = container.querySelector('.ams-col--panel .ams-panel__text')
    expect(panel.textContent).toBe('Bold words')
    expect(panel.style.fontFamily).toContain('Abril Fatface') // Display default
    expect(container.querySelector('.ams-col--quiet .ams-quiet__text').textContent).toBe('Small words')
  })

  it('testimonial, contact and video render their columns', () => {
    const { container } = renderWall([
      { type: 'testimonial', text: 'Wonderful work', name: 'A. Client' },
      { type: 'contact', heading: 'Get in touch' },
      { type: 'video', url: 'https://www.youtube.com/watch?v=abc123' },
    ])
    expect(container.querySelector('.ams-col--testimonial')).toBeTruthy()
    expect(container.textContent).toContain('Wonderful work')
    expect(container.querySelector('.ams-col--contact')).toBeTruthy()
    expect(container.querySelector('.ams-col--media')).toBeTruthy()
  })

  it('tags each column type with the right data-surface for adaptive chrome', () => {
    const imgs = Array.from({ length: 2 }, (_, i) => ({ url: `https://x/${i}.jpg` }))
    const { container } = renderWall([
      { type: 'photo', image: 'https://x/fill.jpg' },
      { type: 'photo', image: 'https://x/centered.jpg', themeState: { amsterdam: { variant: 'centered' } } },
      { type: 'photos', images: imgs },
      { type: 'photos', images: imgs, themeState: { amsterdam: { variant: 'mosaic' } } },
      { type: 'text', content: 'Panel text' },
      { type: 'text', content: 'Quiet text', amsterdamStyle: 'quiet' },
      { type: 'testimonial', text: 'Wonderful work', name: 'A. Client' },
      { type: 'contact', heading: 'Get in touch' },
    ])
    expect(container.querySelector('.ams-col--fill').getAttribute('data-surface')).toBe('image')
    const photoCols = container.querySelectorAll('.ams-col--photo:not(.ams-col--fill)')
    expect(photoCols.length).toBeGreaterThanOrEqual(1)
    expect(photoCols[0].getAttribute('data-surface')).toBe('paper')
    expect(container.querySelector('.ams-col--photorow').getAttribute('data-surface')).toBe('paper')
    expect(container.querySelector('.ams-col--mosaic').getAttribute('data-surface')).toBe('paper')
    expect(container.querySelector('.ams-col--panel').getAttribute('data-surface')).toBe('ink')
    expect(container.querySelector('.ams-col--quiet').getAttribute('data-surface')).toBe('paper')
    expect(container.querySelector('.ams-col--testimonial').getAttribute('data-surface')).toBe('paper')
    expect(container.querySelector('.ams-col--contact').getAttribute('data-surface')).toBe('paper')
  })

  it('photo captions honor photoMeta', () => {
    const { container: withMeta } = renderWall(
      [{ type: 'photo', image: 'https://x/1.jpg', caption: 'T', capture: CAPTURE, themeState: { amsterdam: { variant: 'centered' } } }],
      {}, { photoMeta: 'date' }
    )
    expect(withMeta.querySelector('.ams-caption__meta')).toBeTruthy()
    const { container: noMeta } = renderWall(
      [{ type: 'photo', image: 'https://x/1.jpg', caption: 'T', capture: CAPTURE, themeState: { amsterdam: { variant: 'centered' } } }],
      {}, { photoMeta: 'off' }
    )
    expect(noMeta.querySelector('.ams-caption__meta')).toBeNull()
  })
})
