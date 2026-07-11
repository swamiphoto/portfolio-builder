// __tests__/components/SiteNavLeftRail.test.js
import { render, screen } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const siteConfig = {
  siteName: 'Ansel A',
  pages: [{ id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' }],
  contact: { instagram: 'ansel' },
  footer: { customText: '© 2026 Ansel' },
}

describe('SiteNav left-rail', () => {
  it('renders a fixed rail with site name, nav, and footer text', () => {
    render(<SiteNav siteConfig={siteConfig} username="me" variant="left-rail" basePath="/sites/me" />)
    const rail = screen.getByTestId('left-rail')
    expect(rail).toBeInTheDocument()
    expect(screen.getByText('Ansel A')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('© 2026 Ansel')).toBeInTheDocument()
  })
})
