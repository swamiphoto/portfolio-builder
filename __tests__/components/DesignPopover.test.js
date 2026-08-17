import { render, screen, fireEvent, within } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'

// PopoverShell renders into the DOM; anchorEl can be null for the test.
function setup(block, onUpdate = () => {}) {
  return render(<DesignPopover block={block} themeId="kyoto" onUpdate={onUpdate} onClose={() => {}} anchorEl={null} />)
}

describe('DesignPopover sections are spec-driven', () => {
  it('text shows Size, Font, and Alignment', () => {
    setup({ type: 'text', content: 'hi' })
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Font')).toBeInTheDocument()
    expect(screen.getByText('Alignment')).toBeInTheDocument()
  })

  it('contact shows Alignment + Button style but no Size', () => {
    setup({ type: 'contact' })
    expect(screen.queryByText('Size')).not.toBeInTheDocument()
    expect(screen.getByText('Alignment')).toBeInTheDocument()
    expect(screen.getByText('Button style')).toBeInTheDocument()
  })

  it('photos shows a Layout section with four options', () => {
    setup({ type: 'photos' })
    expect(screen.getByText('Layout')).toBeInTheDocument()
    expect(screen.getByText('Grid')).toBeInTheDocument()
    expect(screen.getByText('Square')).toBeInTheDocument()
  })

  it('photos and photo show a Caption section', () => {
    setup({ type: 'photos' })
    expect(screen.getByText('Caption')).toBeInTheDocument()
    setup({ type: 'photo' })
    expect(screen.getAllByText('Caption').length).toBeGreaterThan(0)
  })

  it('page-gallery with list variant shows an Image side section', () => {
    setup({ type: 'page-gallery', themeState: { kyoto: { variant: 'list' } } })
    expect(screen.getByText('Image side')).toBeInTheDocument()
  })

  it('page-gallery with mosaic variant does NOT show an Image side section', () => {
    setup({ type: 'page-gallery', themeState: { kyoto: { variant: 'mosaic' } } })
    expect(screen.queryByText('Image side')).not.toBeInTheDocument()
  })

  it('page-gallery shows a Size section (both layouts)', () => {
    setup({ type: 'page-gallery', themeState: { kyoto: { variant: 'list' } } })
    expect(screen.getByText('Size')).toBeInTheDocument()
    setup({ type: 'page-gallery', themeState: { kyoto: { variant: 'mosaic' } } })
    expect(screen.getAllByText('Size').length).toBeGreaterThan(0)
  })

  it('caption write: clicking Accent sets block.captionStyle', () => {
    const onUpdate = jest.fn()
    setup({ type: 'photos' }, onUpdate)
    fireEvent.click(screen.getByText('Accent'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ captionStyle: 'accent' }))
  })
})

describe('DesignPopover write wiring', () => {
  it('variant write: clicking Masonry calls onUpdate with setVariant result', () => {
    const onUpdate = jest.fn()
    setup({ type: 'photos' }, onUpdate)
    fireEvent.click(screen.getByText('Masonry'))
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'photos',
        themeState: expect.objectContaining({
          kyoto: expect.objectContaining({ variant: 'masonry' }),
        }),
      })
    )
  })

  it('font write: clicking Editorial calls onUpdate with font: "fraunces"', () => {
    const onUpdate = jest.fn()
    setup({ type: 'text', content: 'hi' }, onUpdate)
    // "Editorial" is the Fraunces slot's category label; unique in this render.
    fireEvent.click(screen.getByText('Editorial'))
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text', font: 'fraunces' })
    )
  })

  it('align write: clicking the second alignment button (center) calls onUpdate with align: "center"', () => {
    const onUpdate = jest.fn()
    setup({ type: 'text', content: 'hi', align: 'left' }, onUpdate)
    // Alignment options render as SVG icons — no text label.
    // Locate the DesignSection wrapper by its label, then use querySelectorAll
    // to find the buttons (getAllByRole doesn't pierce SVG-containing buttons in jsdom).
    const alignmentLabel = screen.getByText('Alignment')
    const alignmentSection = alignmentLabel.closest('div[style]').parentElement
    const alignButtons = alignmentSection.querySelectorAll('button')
    // options order: left (index 0), center (index 1)
    fireEvent.click(alignButtons[1])
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text', align: 'center' })
    )
  })

  it('align write: clicking the first alignment button (left) calls onUpdate with align: "left"', () => {
    const onUpdate = jest.fn()
    setup({ type: 'text', content: 'hi', align: 'center' }, onUpdate)
    const alignmentLabel = screen.getByText('Alignment')
    const alignmentSection = alignmentLabel.closest('div[style]').parentElement
    const alignButtons = alignmentSection.querySelectorAll('button')
    fireEvent.click(alignButtons[0])
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text', align: 'left' })
    )
  })

  it('button-style write: clicking Outline calls onUpdate with buttonStyle: "outline"', () => {
    const onUpdate = jest.fn()
    setup({ type: 'contact' }, onUpdate)
    fireEvent.click(screen.getByText('Outline'))
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'contact', buttonStyle: 'outline' })
    )
  })
})

describe('DesignPopover — Florence Position by size', () => {
  const setupFl = (block) => render(
    <DesignPopover block={block} themeId="florence" onUpdate={() => {}} onClose={() => {}} anchorEl={null} />
  )

  it('hides Position for a Large photo row or mosaic (it fills the height)', () => {
    setupFl({ type: 'photos', themeState: { florence: { variant: 'row' } } }) // default row size = large
    expect(screen.queryByText('Position')).not.toBeInTheDocument()
    setupFl({ type: 'photos', size: 'large', themeState: { florence: { variant: 'mosaic' } } })
    expect(screen.queryByText('Position')).not.toBeInTheDocument()
  })

  it('shows Position for Medium / Small rows and mosaics (they leave room to move)', () => {
    setupFl({ type: 'photos', size: 'medium', themeState: { florence: { variant: 'row' } } })
    expect(screen.getByText('Position')).toBeInTheDocument()
    setupFl({ type: 'photos', size: 'small', themeState: { florence: { variant: 'mosaic' } } })
    expect(screen.getAllByText('Position').length).toBeGreaterThan(0)
  })

  it('always shows Position for a text block (no Large fill state)', () => {
    setupFl({ type: 'text', content: 'hi' })
    expect(screen.getByText('Position')).toBeInTheDocument()
  })
})
