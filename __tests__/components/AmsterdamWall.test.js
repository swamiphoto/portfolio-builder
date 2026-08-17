import { render, fireEvent } from '@testing-library/react'
import AmsterdamWall from '@/components/image-displays/themes/amsterdam/AmsterdamWall'

describe('AmsterdamWall shell', () => {
  it('renders stage + rail + title opener with the site name, default vermilion ink', () => {
    const { container } = render(<AmsterdamWall name="Van der Meer" description="Photographs" siteConfig={{}} />)
    const stage = container.querySelector('.ams-stage')
    expect(stage).toBeTruthy()
    expect(stage.style.getPropertyValue('--ams-ink')).toBe('#e02b20')
    expect(container.querySelector('.ams-rail')).toBeTruthy()
    expect(container.querySelector('.ams-col--title .ams-title__name').textContent).toBe('Van der Meer')
    expect(container.querySelector('.ams-title__desc').textContent).toBe('Photographs')
  })

  it('renders the poster hero when opener=hero and a cover exists', () => {
    const { container } = render(
      <AmsterdamWall name="Van der Meer" siteConfig={{}} opener="hero" cover={{ imageUrl: 'https://x/cover.jpg' }} />
    )
    const hero = container.querySelector('.ams-col--hero')
    expect(hero).toBeTruthy()
    expect(hero.querySelector('.ams-hero__img').getAttribute('src')).toContain('cover.jpg')
    expect(hero.querySelector('.ams-hero__title').textContent).toBe('Van der Meer')
    expect(container.querySelector('.ams-col--title')).toBeNull()
  })

  it('falls back to the title opener when opener=hero but there is no cover', () => {
    const { container } = render(<AmsterdamWall name="V" siteConfig={{}} opener="hero" />)
    expect(container.querySelector('.ams-col--title')).toBeTruthy()
  })

  it('applies the stored ink', () => {
    const { container } = render(
      <AmsterdamWall name="V" siteConfig={{ design: { amsterdamInk: 'black' } }} />
    )
    const stage = container.querySelector('.ams-stage')
    expect(stage.style.getPropertyValue('--ams-ink')).toBe('#141210')
    expect(stage.style.getPropertyValue('--ams-on-ink')).toBe('#f6efe4')
  })

  it('menu column lists nav pages and marks data-open on toggle', () => {
    const pages = [{ id: 'p1', title: 'Iceland', slug: 'iceland', showInNav: true }, { id: 'p2', title: 'About', slug: 'about', showInNav: false }]
    const { container, getByLabelText, getByText } = render(<AmsterdamWall name="V" siteConfig={{ pages }} />)
    expect(container.querySelector('.ams-menu').getAttribute('data-open')).toBe('false')
    fireEvent.click(getByLabelText('Open menu'))
    expect(container.querySelector('.ams-menu').getAttribute('data-open')).toBe('true')
    expect(getByText('Iceland')).toBeTruthy()
    expect(container.textContent).not.toContain('About')
  })

  it('tags the title opener and menu as ink surfaces for adaptive chrome', () => {
    const { container } = render(<AmsterdamWall name="V" description="D" siteConfig={{}} />)
    expect(container.querySelector('.ams-col--title').getAttribute('data-surface')).toBe('ink')
    expect(container.querySelector('.ams-menu').getAttribute('data-surface')).toBe('ink')
  })

  it('tags the poster hero opener as a dark ground so the rail starts black', () => {
    const { container } = render(
      <AmsterdamWall name="V" siteConfig={{}} opener="hero" cover={{ imageUrl: 'https://x/cover.jpg' }} />
    )
    expect(container.querySelector('.ams-col--hero').getAttribute('data-surface')).toBe('dark')
  })
})
