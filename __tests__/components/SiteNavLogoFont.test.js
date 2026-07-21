import { render, screen } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const cfg = (extra = {}) => ({
  siteName: 'Ansel A',
  pages: [{ id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' }],
  ...extra,
})

describe('SiteNav logo font', () => {
  it('applies Inter uppercase for logoFont=modern on the left rail', () => {
    render(<SiteNav siteConfig={cfg({ logoFont: 'modern' })} username="me" variant="left-rail" basePath="/sites/me" />)
    const brand = screen.getByText('Ansel A')
    expect(brand.style.fontFamily).toMatch(/Inter/)
    expect(brand.style.textTransform).toBe('uppercase')
  })
  it('applies Muse serif for logoFont=theme', () => {
    render(<SiteNav siteConfig={cfg({ logoFont: 'theme' })} username="me" variant="left-rail" basePath="/sites/me" />)
    const brand = screen.getByText('Ansel A')
    expect(brand.style.fontFamily).toContain('Muse')
  })
})
