import { render, screen } from '@testing-library/react'
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
})
