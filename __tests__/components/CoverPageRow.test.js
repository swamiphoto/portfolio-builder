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

  it('shows "Add a cover page" and calls onEnableCover when the cover is off', () => {
    const onEnableCover = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: false, cover: {} }} selected={false} onSelect={() => {}} onEnableCover={onEnableCover} />)
    const el = screen.getByText('Add a cover page')
    expect(el).toBeInTheDocument()
    fireEvent.click(el)
    expect(onEnableCover).toHaveBeenCalled()
  })

  it('renders the cover image as the thumbnail when present', () => {
    const { container } = render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: { imageUrl: 'https://x/y.jpg' } }} selected={false} onSelect={() => {}} onEnableCover={() => {}} />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('y.jpg')
  })
})
