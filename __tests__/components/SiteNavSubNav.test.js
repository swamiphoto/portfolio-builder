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
  it('shows a caret for a parent and reveals children on click when dropdown', () => {
    render(<SiteNav siteConfig={withChildren('dropdown')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    const trigger = screen.getByRole('button', { name: /Work/ })
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByText('Portraits')).toBeInTheDocument()
  })
  it('does not render a dropdown when subNavStyle is inline', () => {
    render(<SiteNav siteConfig={withChildren('inline')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    // Parent renders as a plain link, no caret trigger button
    expect(screen.queryByRole('button', { name: /Work/ })).not.toBeInTheDocument()
  })
})
