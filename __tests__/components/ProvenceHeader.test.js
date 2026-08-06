import { render, fireEvent, act } from '@testing-library/react'
import ProvenceHeader from '@/components/image-displays/page/ProvenceHeader'

const pages = [
  { id: 'home', title: 'Home', slug: 'home' },
  { id: 'about', title: 'About', slug: 'about' },
  { id: 'hidden', title: 'Secret', slug: 'secret', showInNav: false },
  { id: 'child', title: 'Child', slug: 'child', parentId: 'about' },
]

describe('ProvenceHeader', () => {
  it('shows the gallery name, a slideshow button, and a More menu of top-level nav pages', () => {
    const { getByText, queryByText, getByTestId } = render(
      <ProvenceHeader title="Wasserman Family" basePath="/sites/alex" pages={pages} currentPageId="home" slideshowHref="/s" />
    )
    expect(getByTestId('provence-header')).toBeTruthy()
    expect(getByText('Wasserman Family')).toBeTruthy()
    expect(getByText('View Music Show').getAttribute('href')).toBe('/s')
    // More menu is collapsed until clicked
    expect(queryByText('About')).toBeNull()
    fireEvent.click(getByText('More ▾'))
    expect(getByText('Home')).toBeTruthy()
    expect(getByText('About')).toBeTruthy()
    // hidden + child pages are excluded from the top-level menu
    expect(queryByText('Secret')).toBeNull()
    expect(queryByText('Child')).toBeNull()
  })

  it('reveals itself (is-visible) only after scrolling past the threshold', () => {
    const { getByTestId } = render(
      <ProvenceHeader title="Gallery" basePath="/sites/alex" pages={pages} />
    )
    const header = getByTestId('provence-header')
    expect(header.className).not.toContain('is-visible')
    act(() => {
      window.scrollY = 5000
      window.dispatchEvent(new Event('scroll'))
    })
    expect(header.className).toContain('is-visible')
  })
})
