import { render, screen, fireEvent } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const withChildren = (subNavStyle) => ({
  siteName: 'Ansel A',
  design: { theme: 'kyoto', subNavStyle },
  pages: [
    { id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' },
    { id: 'portraits', title: 'Portraits', slug: 'portraits', parentId: 'work', showInNav: true, type: 'page' },
  ],
})

describe('SiteNav sub-nav dropdown (cover-embedded)', () => {
  it('shows a caret button and reveals children on caret click when dropdown', () => {
    render(<SiteNav siteConfig={withChildren('dropdown')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    // Caret button is now separate from the parent label
    const caretBtn = screen.getByLabelText('Work submenu')
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    fireEvent.click(caretBtn)
    expect(screen.getByText('Portraits')).toBeInTheDocument()
  })

  it('navigates to parent page when parent label is clicked in dropdown mode', () => {
    const onPageClick = jest.fn()
    render(<SiteNav siteConfig={withChildren('dropdown')} username="me" variant="cover-embedded" basePath="/sites/me" onPageClick={onPageClick} />)
    // Parent label renders as a button (NavLink with onPageClick)
    const parentLabel = screen.getByRole('button', { name: 'Work' })
    fireEvent.click(parentLabel)
    expect(onPageClick).toHaveBeenCalledWith('work')
  })

  it('does not render a dropdown when subNavStyle is inline', () => {
    render(<SiteNav siteConfig={withChildren('inline')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    // No caret button in inline mode
    expect(screen.queryByLabelText('Work submenu')).not.toBeInTheDocument()
  })

  it('marks the parent active when one of its subpages is the current page', () => {
    // currentPageId is the child; the parent "Work" should still read as active.
    render(<SiteNav siteConfig={withChildren('dropdown')} username="me" variant="cover-embedded" basePath="/sites/me" currentPageId="portraits" />)
    expect(screen.getByText('Work').className).toMatch(/underline/)
  })
})
