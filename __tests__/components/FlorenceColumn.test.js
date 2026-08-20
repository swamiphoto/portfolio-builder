import { render } from '@testing-library/react'
import FlorenceWall from '@/components/image-displays/themes/florence/FlorenceWall'

function renderWall(blocks, siteConfig = {}, extra = {}) {
  return render(<FlorenceWall name="W" siteConfig={siteConfig} blocks={blocks} {...extra} />)
}

describe('FlorenceColumn text block', () => {
  it('renders plain text as-is', () => {
    const { container } = renderWall([{ type: 'text', content: 'Plain words' }])
    expect(container.querySelector('.florence-text').textContent).toBe('Plain words')
  })

  it('renders markdown text blocks formatted, not as literal markdown syntax', () => {
    const { container } = renderWall([{ type: 'text', content: '**bold** words', format: 'markdown' }])
    const text = container.querySelector('.florence-col--text')
    expect(text.querySelector('strong')).toBeTruthy()
    expect(text.querySelector('strong').textContent).toBe('bold')
    expect(text.textContent).not.toContain('**')
  })
})

describe('FlorenceColumn empty video block', () => {
  it('previews a placeholder when showPlaceholders is on (editor)', () => {
    const { container } = renderWall([{ type: 'video', url: '' }], {}, { showPlaceholders: true })
    expect(container.querySelector('.florence-col--media')).toBeTruthy()
    expect(container.querySelector('.florence-video-placeholder')).toBeTruthy()
  })

  it('renders nothing on the published site (no placeholders)', () => {
    const { container } = renderWall([{ type: 'video', url: '' }])
    expect(container.querySelector('.florence-col--media')).toBeFalsy()
  })
})

describe('FlorenceColumn empty testimonial block', () => {
  it('previews a placeholder when showPlaceholders is on (editor)', () => {
    const { container } = renderWall([{ type: 'testimonial' }], {}, { showPlaceholders: true })
    expect(container.querySelector('.florence-col--testimonial')).toBeTruthy()
    expect(container.querySelector('.florence-testimonial-placeholder')).toBeTruthy()
  })

  it('renders nothing on the published site (no placeholders)', () => {
    const { container } = renderWall([{ type: 'testimonial' }])
    expect(container.querySelector('.florence-col--testimonial')).toBeFalsy()
  })
})

describe('FlorenceColumn editor hover keeps the column layout', () => {
  // In the editor, blocks are clickable, so the wall passes hoverProps that include
  // style:{cursor:'pointer'}. That style must MERGE with the column's own layout
  // style, not replace it — otherwise a framed centered photo loses its vertical
  // centering and pins to the top of the column in the preview pane.
  it('a clickable framed centered photo stays vertically centered (cursor + center)', () => {
    const block = { type: 'photo', image: 'https://x/one.jpg', caption: 'Anagha', florenceFrame: 'mat', themeState: { florence: { variant: 'centered' } } }
    const { container } = renderWall([block], {}, { onBlockClick: () => {}, onBlockHover: () => {} })
    const section = container.querySelector('.florence-col--framed[data-fit="centered"]')
    expect(section).toBeTruthy()
    expect(section.style.justifyContent).toBe('center')
    expect(section.style.cursor).toBe('pointer')
  })
})

describe('FlorenceColumn centers short text + testimonial columns', () => {
  // The Position control was retired (resolveFlorenceAnchor always returns 'top'), so
  // these short columns used to pin to the top of their full-height column. They
  // should sit vertically centered like the photos — on the published site too.
  it('a text block is vertically centered in its column', () => {
    const { container } = renderWall([{ type: 'text', content: 'A short note.' }])
    const section = container.querySelector('.florence-col--text')
    expect(section).toBeTruthy()
    expect(section.style.justifyContent).toBe('center')
  })

  it('a testimonial block is vertically centered in its column', () => {
    const { container } = renderWall([{ type: 'testimonial', text: 'Wonderful work.', name: 'Jane' }])
    const section = container.querySelector('.florence-col--testimonial')
    expect(section).toBeTruthy()
    expect(section.style.justifyContent).toBe('center')
  })
})

describe('FlorenceColumn framed Mosaic is a scatter, not a flat row', () => {
  const imgs = [{ url: 'https://x/1.jpg' }, { url: 'https://x/2.jpg' }, { url: 'https://x/3.jpg' }]

  it('a Mosaic set with a frame scatters framed mounts (varied heights), keeping the mosaic feel', () => {
    const { container } = renderWall([{ type: 'photos', images: imgs, florenceFrame: 'mat', themeState: { florence: { variant: 'mosaic' } } }])
    // Framed mounts present, arranged as a scatter — NOT collapsed to the raw
    // (unframed) mosaic packing, and NOT a uniform framed row.
    expect(container.querySelector('.florence-row--scatter')).toBeTruthy()
    expect(container.querySelector('.florence-mount--mat')).toBeTruthy()
    expect(container.querySelector('.florence-col--mosaic')).toBeNull()
    const mounts = container.querySelectorAll('.florence-row--scatter .florence-mount')
    expect(mounts.length).toBe(3)
    // data-flip staggers the mounts up/down (0,1,2)
    expect([...mounts].map(m => m.getAttribute('data-flip'))).toEqual(['0', '1', '2'])
    // heights vary across the scatter (not one uniform mount height)
    const heights = [...container.querySelectorAll('.florence-row--scatter .florence-mount__photo')].map(p => p.style.height)
    expect(new Set(heights).size).toBeGreaterThan(1)
  })

  it('a Row set with a frame stays a uniform framed row (no scatter)', () => {
    const { container } = renderWall([{ type: 'photos', images: imgs, florenceFrame: 'mat', themeState: { florence: { variant: 'row' } } }])
    expect(container.querySelector('.florence-row--framed')).toBeTruthy()
    expect(container.querySelector('.florence-row--scatter')).toBeNull()
  })
})
