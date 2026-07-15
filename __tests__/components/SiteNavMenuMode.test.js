import { render, screen, fireEvent } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const cfg = (navStyle) => ({
  siteName: 'Ansel A',
  design: { theme: 'kyoto', navStyle },
  pages: [
    { id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' },
    { id: 'about', title: 'About', slug: 'about', showInNav: true, type: 'page' },
  ],
})

describe('SiteNav menu mode (cover-embedded)', () => {
  it('renders inline links (no hamburger) when navStyle=links', () => {
    render(<SiteNav siteConfig={cfg('links')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument()
  })
  it('renders a hamburger that opens an overlay of nav items when navStyle=menu', () => {
    render(<SiteNav siteConfig={cfg('menu')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.queryByText('Work')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })
})
