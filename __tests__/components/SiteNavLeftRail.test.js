// __tests__/components/SiteNavLeftRail.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const siteConfig = {
  siteName: 'Ansel A',
  pages: [{ id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' }],
  contact: { instagram: 'ansel' },
  footer: { customText: '© 2026 Ansel' },
}

// Helper: render SiteNav in left-rail variant with optional currentPageId
function renderRail(cfg, { currentPageId } = {}) {
  return render(
    <SiteNav
      siteConfig={cfg}
      username="me"
      variant="left-rail"
      basePath="/sites/me"
      currentPageId={currentPageId}
    />
  )
}

describe('SiteNav left-rail', () => {
  it('renders a fixed rail with site name and nav', () => {
    renderRail(siteConfig)
    const rail = screen.getByTestId('left-rail')
    expect(rail).toBeInTheDocument()
    expect(screen.getByText('Ansel A')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('marks the current page as active via currentPageId (terracotta accent color)', () => {
    renderRail(siteConfig, { currentPageId: 'work' })
    const link = screen.getByText('Work')
    // New design: active state is communicated via inline color (terracotta), not underline class
    expect(link.style.color).toBe('var(--theme-accent, #b5502e)')
  })
})

// Tests for Task 3: serif rail, collapsible subpages, Fraunces font
const config = {
  siteName: 'Swami Photography',
  design: { theme: 'manhattan' },
  contact: {},
  pages: [
    { id: 'work', title: 'Recent Work', slug: 'work', showInNav: true },
    { id: 'weddings', title: 'Weddings', slug: 'weddings', showInNav: true },
    { id: 'engage', title: 'Engagements', slug: 'engagements', parentId: 'weddings', showInNav: true },
  ],
}

it('hides subpages until the caret is expanded', () => {
  renderRail(config, { currentPageId: 'work' })
  expect(screen.queryByText('Engagements')).toBeNull()
  fireEvent.click(screen.getByLabelText('Weddings submenu'))
  expect(screen.getByText('Engagements')).toBeInTheDocument()
})

it('auto-expands the parent when a subpage is the current page', () => {
  renderRail(config, { currentPageId: 'engage' })
  expect(screen.getByText('Engagements')).toBeInTheDocument()
})

it('uses fraunces (not uppercase) for rail menu items', () => {
  renderRail(config, { currentPageId: 'work' })
  const link = screen.getByText('Recent Work')
  expect(link.className).toContain('font-fraunces')
  expect(link.className).not.toContain('uppercase')
})
