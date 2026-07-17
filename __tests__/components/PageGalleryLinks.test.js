import { render, screen } from '@testing-library/react'
import PageGalleryLinks from '../../components/image-displays/gallery/page-gallery/PageGalleryLinks'

const pages = [
  { id: 'a', title: 'Cali', slug: 'cali', thumbnail: { imageUrl: 'x.jpg' } },
  { id: 'b', title: 'Nevada', slug: 'nevada', thumbnail: { imageUrl: 'y.jpg' } },
]

function makePages(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    title: `Page ${i}`,
    slug: `page-${i}`,
    thumbnail: { imageUrl: `${i}.jpg` },
  }))
}

describe('PageGalleryLinks', () => {
  it('list renders two links with correct hrefs', () => {
    const { container } = render(
      <PageGalleryLinks pages={pages} variant="list" linkBase="/site" />
    )
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toBe('/site/cali')
    expect(links[1].getAttribute('href')).toBe('/site/nevada')
  })

  it('list + imageSide "one" has no reversed rows', () => {
    const { container } = render(
      <PageGalleryLinks pages={pages} variant="list" imageSide="one" linkBase="/site" />
    )
    const links = container.querySelectorAll('a')
    links.forEach((a) => expect(a.className).not.toMatch(/flex-row-reverse/))
  })

  it('list + imageSide "alternating" reverses the second row', () => {
    const { container } = render(
      <PageGalleryLinks pages={pages} variant="list" imageSide="alternating" linkBase="/site" />
    )
    const links = container.querySelectorAll('a')
    expect(links[0].className).not.toMatch(/md:flex-row-reverse/)
    expect(links[1].className).toMatch(/md:flex-row-reverse/)
  })

  it('mosaic n=4 uses a 2-column grid with no hero tile', () => {
    const { container } = render(
      <PageGalleryLinks pages={makePages(4)} variant="mosaic" linkBase="/site" />
    )
    const grid = container.querySelector('div.grid')
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0,1fr))')
    const heroes = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.style.gridColumn === 'span 2'
    )
    expect(heroes).toHaveLength(0)
    expect(container.querySelectorAll('img.aspect-\\[2\\/1\\]')).toHaveLength(0)
  })

  it('mosaic n=5 uses a 3-column grid with exactly one wide hero tile', () => {
    const { container } = render(
      <PageGalleryLinks pages={makePages(5)} variant="mosaic" linkBase="/site" />
    )
    const grid = container.querySelector('div.grid')
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, minmax(0,1fr))')
    const heroes = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.style.gridColumn === 'span 2'
    )
    expect(heroes).toHaveLength(1)
    expect(container.querySelectorAll('img.aspect-\\[2\\/1\\]')).toHaveLength(1)
  })

  it('mosaic renders titles', () => {
    render(<PageGalleryLinks pages={pages} variant="mosaic" linkBase="/site" />)
    expect(screen.getByText('Cali')).toBeInTheDocument()
    expect(screen.getByText('Nevada')).toBeInTheDocument()
  })

  it('renders nothing when there are no pages', () => {
    const { container } = render(<PageGalleryLinks pages={[]} variant="list" linkBase="/site" />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('size scales the container width and list thumbnail height', () => {
    const small = render(<PageGalleryLinks pages={pages} variant="list" size="small" linkBase="/site" />)
    expect(small.container.querySelector('div.mx-auto').className).toMatch(/max-w-4xl/)
    expect(small.container.querySelector('img').className).toMatch(/h-\[200px\]/)

    const large = render(<PageGalleryLinks pages={pages} variant="list" size="large" linkBase="/site" />)
    expect(large.container.querySelector('div.mx-auto').className).toMatch(/max-w-6xl/)
    expect(large.container.querySelector('img').className).toMatch(/h-\[280px\]/)
  })

  it('size scales the mosaic container width', () => {
    const small = render(<PageGalleryLinks pages={makePages(4)} variant="mosaic" size="small" linkBase="/site" />)
    expect(small.container.querySelector('div.mx-auto').className).toMatch(/max-w-4xl/)
  })
})
