import { render, screen, fireEvent } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'

jest.mock('@/components/admin/platform/PopoverShell', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="shell">{children}</div>,
}))

function open(block, themeId = 'kyoto') {
  const onUpdate = jest.fn()
  render(<DesignPopover block={block} themeId={themeId} onUpdate={onUpdate} onClose={() => {}} anchorEl={null} />)
  return onUpdate
}

describe('DesignPopover theme-driven variants', () => {
  it('shows Kyoto photo variants and writes themeState.kyoto', () => {
    const onUpdate = open({ type: 'photo', imageUrl: 'x' }, 'kyoto')
    fireEvent.click(screen.getByText('Centered'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      themeState: expect.objectContaining({ kyoto: { variant: 'centered' } }),
    }))
  })

  it('shows Manhattan photo variants (Framed) and writes themeState.manhattan', () => {
    const onUpdate = open({ type: 'photo', imageUrl: 'x' }, 'manhattan')
    expect(screen.getByText('Framed')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Framed'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      themeState: expect.objectContaining({ manhattan: { variant: 'framed' } }),
    }))
  })

  it('returns null when a block type has a single variant and no alignment (contact)', () => {
    const { container } = render(
      <DesignPopover block={{ type: 'contact' }} themeId="kyoto" onUpdate={() => {}} onClose={() => {}} anchorEl={null} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('mirrors a photos variant onto legacy type/layout while writing themeState', () => {
    const onUpdate = open({ type: 'photos', images: [{ url: 'a' }] }, 'kyoto')
    fireEvent.click(screen.getByText('Masonry'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'masonry',
      layout: 'masonry',
      themeState: expect.objectContaining({ kyoto: { variant: 'masonry' } }),
    }))
  })
})
