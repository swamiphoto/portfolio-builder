import { render, screen, fireEvent } from '@testing-library/react'
import CoverPageRow from '@/components/admin/platform/CoverPageRow'

describe('CoverPageRow', () => {
  it('shows "Cover page" when the cover is on', () => {
    render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: {} }} selected={false} onSelect={() => {}} onEnableCover={() => {}} />)
    expect(screen.getByText('Cover page')).toBeInTheDocument()
  })

  it('calls onSelect when the cover is on and the row is clicked', () => {
    const onSelect = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: {} }} selected={false} onSelect={onSelect} onEnableCover={() => {}} />)
    fireEvent.click(screen.getByText('Cover page'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('shows the toggle OFF and enables the cover when toggled on', () => {
    const onEnableCover = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: false, cover: {} }} selected={false} onSelect={() => {}} onEnableCover={onEnableCover} onDisableCover={() => {}} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    // gear only appears when the cover is on
    expect(screen.queryByTitle('Cover settings')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(onEnableCover).toHaveBeenCalled()
  })

  it('disables the cover when the toggle is switched off', () => {
    const onDisableCover = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: {} }} selected={false} onSelect={() => {}} onEnableCover={() => {}} onDisableCover={onDisableCover} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    expect(onDisableCover).toHaveBeenCalled()
  })

  it('renders the cover image as the thumbnail when present', () => {
    const { container } = render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: { imageUrl: 'https://x/y.jpg' } }} selected={false} onSelect={() => {}} onEnableCover={() => {}} />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('y.jpg')
  })

  it('opens the cover settings via the gear without selecting the row', () => {
    const onSelect = jest.fn()
    const onConfigure = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: {} }} selected={false} onSelect={onSelect} onConfigure={onConfigure} onEnableCover={() => {}} />)
    fireEvent.click(screen.getByTitle('Cover settings'))
    expect(onConfigure).toHaveBeenCalled()
    // gear click must not also trigger row selection (stopPropagation)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
