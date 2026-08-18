import { render } from '@testing-library/react'
import AmsterdamWall from '@/components/image-displays/themes/amsterdam/AmsterdamWall'

const CAPTURE = { capturedAt: '2024-03-12T12:00:00Z', cameraModel: 'Nikon Z6' }

function renderWall(blocks, siteConfig = {}, extra = {}) {
  return render(<AmsterdamWall name="W" siteConfig={siteConfig} blocks={blocks} {...extra} />)
}

describe('AmsterdamColumn block treatments', () => {
  it('mounts a framed photo (caption on the card) and rotates styles for a Mixed set', () => {
    const { container } = renderWall([
      { type: 'photo', image: 'https://x/a.jpg', caption: 'Keizersgracht', amsterdamFrame: 'card', themeState: { amsterdam: { variant: 'centered' } } },
      { type: 'photos', amsterdamFrame: 'mixed', themeState: { amsterdam: { variant: 'row' } },
        images: [{ url: 'https://x/1.jpg' }, { url: 'https://x/2.jpg' }, { url: 'https://x/3.jpg' }, { url: 'https://x/4.jpg' }] },
    ])
    // Single Card mount: the caption prints on the card (not a beside plaque).
    const card = container.querySelector('.ams-col--framed .ams-mount--card')
    expect(card).toBeTruthy()
    expect(card.querySelector('.ams-mount__title').textContent).toBe('Keizersgracht')
    expect(container.querySelector('.ams-col--framed .ams-caption--beside')).toBeNull()
    // Mixed set rotates card -> mount -> print across the images.
    const styles = Array.from(container.querySelectorAll('.ams-row--framed .ams-mount'))
      .map(m => m.className.match(/ams-mount--(\w+)/)[1])
    expect(styles).toEqual(['card', 'mount', 'print', 'card'])
  })

  it('the Caption style control drives the caption typography (plaque + framed)', () => {
    const { container } = renderWall([
      { type: 'photo', image: 'https://x/a.jpg', caption: 'Herengracht', captionStyle: 'accent' },
      { type: 'photo', image: 'https://x/b.jpg', caption: 'Keizersgracht', amsterdamFrame: 'print', captionStyle: 'serif', themeState: { amsterdam: { variant: 'centered' } } },
    ])
    // Plaque caption picks up the Accent style (uppercase + red).
    const plaque = container.querySelector('.ams-figure--plaque .ams-caption__title')
    expect(plaque.getAttribute('style')).toMatch(/text-transform: uppercase/)
    // Framed mount caption picks up the Serif style (Cormorant).
    const mount = container.querySelector('.ams-mount--print .ams-mount__title')
    expect(mount.getAttribute('style')).toMatch(/Cormorant/)
  })

  it('an uncaptioned photo goes full-bleed; a captioned one hangs with a right-side plaque', () => {
    const { container } = renderWall([
      { type: 'photo', image: 'https://x/one.jpg' },
      { type: 'photo', image: 'https://x/two.jpg', caption: 'BRUG' },
      { type: 'photo', image: 'https://x/three.jpg', caption: 'GRACHT', themeState: { amsterdam: { variant: 'centered' } } },
    ])
    // No caption => full-bleed Fill (no plaque).
    const fill = container.querySelector('.ams-col--fill')
    expect(fill).toBeTruthy()
    expect(fill.querySelector('.ams-caption')).toBeNull()
    // A caption => a beside plaque, whether the photo is Fill or Centered.
    expect(container.querySelectorAll('.ams-figure--plaque .ams-caption--beside').length).toBe(2)
    expect(container.textContent).toContain('BRUG')
    expect(container.textContent).toContain('GRACHT')
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

  it('every text block renders as a Quiet museum-label column (no Panel style)', () => {
    const { container } = renderWall([
      { type: 'text', content: 'Small words' },
      // A stored legacy amsterdamStyle:'panel' is ignored — quiet is the only style now.
      { type: 'text', content: 'Bold words', amsterdamStyle: 'panel' },
    ])
    expect(container.querySelector('.ams-col--panel')).toBeNull()
    const quiets = container.querySelectorAll('.ams-col--quiet .ams-quiet__text')
    expect(quiets).toHaveLength(2)
    expect(quiets[0].textContent).toBe('Small words')
    expect(quiets[1].textContent).toBe('Bold words')
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

  it('paints every column a De Stijl ground in rotation (black / light / red)', () => {
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
    // No cover => title opener (ink), so the block grounds begin at dark and cycle
    // dark -> light -> ink, regardless of block type — the surface IS the rhythm.
    const grounds = Array.from(container.querySelectorAll('.ams-col[data-block-index]'))
      .sort((a, b) => Number(a.dataset.blockIndex) - Number(b.dataset.blockIndex))
      .map(el => el.getAttribute('data-surface'))
    expect(grounds).toEqual(['dark', 'light', 'ink', 'dark', 'light', 'ink', 'dark', 'light'])
    // Every ground is one of the three, and no two neighbours share a color.
    grounds.forEach((g, i) => {
      expect(['dark', 'light', 'ink']).toContain(g)
      if (i > 0) expect(g).not.toBe(grounds[i - 1])
    })
  })

  it('renders placeholders for empty photo/photos/text blocks only when showPlaceholders', () => {
    const empty = [
      { type: 'photo' },
      { type: 'photo', amsterdamFrame: 'card', themeState: { amsterdam: { variant: 'centered' } } },
      { type: 'photos', themeState: { amsterdam: { variant: 'row' } } },
      { type: 'text' },
    ]
    // Without the flag, empty blocks render nothing at all.
    const { container: off } = renderWall(empty)
    expect(off.querySelectorAll('.ams-col[data-block-index]')).toHaveLength(0)
    expect(off.querySelector('.wall-placeholder')).toBeNull()
    // With the flag, each empty block previews its layout with placeholder boxes.
    const { container: on } = renderWall(empty, {}, { showPlaceholders: true })
    expect(on.querySelectorAll('.ams-col[data-block-index]')).toHaveLength(4)
    // Fill photo, framed centered photo, and a 3-up row all show placeholder boxes.
    expect(on.querySelector('.ams-col--fill .wall-placeholder')).toBeTruthy()
    expect(on.querySelector('.ams-mount--card .wall-placeholder')).toBeTruthy()
    expect(on.querySelectorAll('.ams-col--photorow .wall-placeholder')).toHaveLength(3)
    // Placeholders carry no captions; the empty text block shows skeleton lines.
    expect(on.querySelector('.ams-caption')).toBeNull()
    expect(on.querySelectorAll('.wall-text-placeholder span')).toHaveLength(3)
  })

  it('renders markdown text blocks formatted, not as literal markdown syntax', () => {
    const { container } = renderWall([
      { type: 'text', content: '**bold** words', format: 'markdown' },
      { type: 'text', content: '**quiet bold**', format: 'markdown' },
    ])
    const quiets = container.querySelectorAll('.ams-col--quiet .ams-quiet__text')
    expect(quiets).toHaveLength(2)
    quiets.forEach((q) => {
      expect(q.querySelector('strong')).toBeTruthy()
      expect(q.textContent).not.toContain('**')
    })
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
