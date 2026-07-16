import { render, screen } from '@testing-library/react'
import SiteFooter from '@/components/image-displays/page/SiteFooter'

describe('SiteFooter', () => {
  it('always renders a footer (legacy footerLayout none falls back to simple)', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'none' } }} />)
    expect(screen.getByText(/Ansel/)).toBeInTheDocument()
  })
  it('simple layout shows the copyright line only', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'simple' } }} />)
    expect(screen.getByText(/Ansel/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('expanded layout shows social links from contact', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'expanded' }, contact: { instagram: '@ansel', website: 'ansel.com' } }} />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map(a => a.getAttribute('href'))
    expect(hrefs).toContain('https://instagram.com/ansel')
    expect(hrefs).toContain('https://ansel.com')
  })
  it('expanded with no contacts falls back to the copyright line only', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'expanded' }, contact: {} }} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/Ansel/)).toBeInTheDocument()
  })
})
