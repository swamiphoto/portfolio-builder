import { render, screen, fireEvent } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))
// OverflowNav uses ResizeObserver, absent in jsdom:
beforeAll(() => { global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} } })

const cfg = (extra = {}) => ({
  siteName: 'Ansel A',
  design: { theme: 'kyoto', ...(extra.design || {}) },
  pages: [
    { id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' },
    { id: 'portraits', title: 'Portraits', slug: 'portraits', parentId: 'work', showInNav: true, type: 'page' },
  ],
})

describe('SiteNav header-dropdown', () => {
  it('shows a caret dropdown for a parent with children in dropdown mode', () => {
    render(<SiteNav siteConfig={cfg({ design: { subNavStyle: 'dropdown' } })} username="me" variant="header-dropdown" basePath="/sites/me" />)
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Work submenu'))
    expect(screen.getByText('Portraits')).toBeInTheDocument()
  })
  it('shows a desktop hamburger when navStyle=menu', () => {
    render(<SiteNav siteConfig={cfg({ design: { navStyle: 'menu' } })} username="me" variant="header-dropdown" basePath="/sites/me" />)
    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Portraits')).toBeInTheDocument()
  })
})
